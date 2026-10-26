import "server-only";
import { partyOf } from "@/domain/bookings";
import type { Viewer } from "@/domain/demo";
import { decideReference, newReference, referenceDraftProblem, type OwnerAnswers } from "@/domain/references";
import { recordJobs } from "@/domain/hire";
import { REFERENCE_COPY } from "@/domain/recordCopy";
import { isRecordToken, recordEntries, sharedRecord, type SharedRecord } from "@/domain/workRecord";
import type { RecordViewResponse, ReferenceViewResponse } from "@/schemas/record";
import { AppError } from "../errors";
import type { ReferenceRepository } from "../repositories/referenceRepository";

export interface ReferenceServiceDeps {
  references: ReferenceRepository;
  /** The AI writes the wording from the answers and tasks only (server/ai.ts). */
  writeReference: (answers: OwnerAnswers, tasks: string[]) => Promise<string>;
  consumeQuota: (uid: string, bucket: string, limit: number, options: { message: string }) => Promise<void>;
  aiDailyLimit: number;
  /** A fresh 144-bit share token. */
  newToken: () => string;
}

const NOT_FOUND = "We cannot find that reference. Go back to your bookings and check.";
const notFound = () => new AppError(404, "not_found", NOT_FOUND);
const AI_LIMIT = "You've used today's writing help. Try again tomorrow.";

/**
 * References and the work record. The AI only writes the wording; every
 * decision (when it can be written, who decides, what's shared) comes from
 * src/domain, and each write is one transaction with its audit entry.
 */
export function createReferenceService({ references, writeReference, consumeQuota, aiDailyLimit, newToken }: ReferenceServiceDeps) {
  return {
    /** The reference on a booking: the young person's to review, or the owner's answers, read-only. */
    async view(viewer: Viewer, bookingId: string): Promise<ReferenceViewResponse> {
      const { booking, reference } = await references.forBooking(bookingId);
      const party = partyOf(viewer, booking);
      if (!booking || !party) throw notFound();
      const answers = booking.ended?.answers ?? null;
      if (party === "business") return { party, answers, reference: null, canWrite: false };
      const shown = reference && reference.status !== "withdrawn" ? { status: reference.status, text: reference.text, answers: reference.answers, challengeRejected: reference.challengeRejected ?? false } : null;
      return { party, answers, reference: shown, withdrawn: reference?.status === "withdrawn", canWrite: !reference && referenceDraftProblem(viewer.uid, booking) === null };
    },

    /**
     * Writes the reference, once, after Received. Called straight after the
     * young person confirms, and again from "Write my reference" if the AI
     * didn't answer then. A failure writes nothing and is logged.
     */
    async draft(viewer: Viewer, bookingId: string): Promise<{ status: "written" | "unchanged" }> {
      const { booking, reference, tasks } = await references.forBooking(bookingId);
      if (reference) return { status: "unchanged" };
      const problem = referenceDraftProblem(viewer.uid, booking);
      if (problem === "not_found" || !booking) throw notFound();
      if (problem) throw new AppError(409, problem, REFERENCE_COPY.notYet);
      await consumeQuota(viewer.uid, "ai", aiDailyLimit, { message: AI_LIMIT });
      const answers = booking.ended?.answers;
      if (!answers) throw new AppError(409, "no_answers", REFERENCE_COPY.notYet);
      // The model's failure, in words about the reference, with the button that's on screen.
      const text = await writeReference(answers, tasks).catch((error: unknown) => {
        throw error instanceof AppError && error.code === "ai_unavailable" ? new AppError(502, "ai_unavailable", REFERENCE_COPY.aiFailed) : error;
      });
      const record = newReference(booking, tasks, text);
      if (!record) throw new AppError(409, "no_answers", REFERENCE_COPY.notYet);
      await references.create(bookingId, record, viewer.uid);
      return { status: "written" };
    },

    /** "Add to my record" or "Challenge it", by the young person it's about, once. A challenge opens a review case. */
    async decide(viewer: Viewer, referenceId: string, choice: { action: "approve" } | { action: "challenge"; reason: string }): Promise<{ status: "done" | "unchanged" }> {
      return references.transactDecide<{ status: "done" | "unchanged" }>(referenceId, viewer.uid, (reference) => {
        const decision = decideReference(viewer.uid, reference, referenceId, choice);
        if (decision.kind === "refuse") throw decision.problem === "not_found" ? notFound() : new AppError(409, "already_decided", REFERENCE_COPY.challenged);
        if (decision.kind === "unchanged") return { write: null, result: { status: "unchanged" } };
        if (decision.kind === "approve") return { write: { status: "approved", audit: "reference_approved" }, result: { status: "done" } };
        return { write: { status: "challenged", review: decision.reviewCase, audit: "reference_challenged" }, result: { status: "done" } };
      });
    },

    /** The young person's own record, with a share link made on first visit. */
    async record(viewer: Viewer): Promise<RecordViewResponse> {
      const { firstName, bookings, references: refs, jobs } = await references.workerRecord(viewer.uid);
      const shareToken = await references.shareToken(viewer.uid, newToken());
      return { firstName, shareToken, entries: recordEntries(bookings, refs), jobs: recordJobs(jobs) };
    },

    /** The shared record: approved content only. An unknown token and a malformed one look the same. */
    async shared(token: string): Promise<SharedRecord | null> {
      if (!isRecordToken(token)) return null;
      const uid = await references.byShareToken(token);
      if (!uid) return null;
      const { firstName, bookings, references: refs, jobs } = await references.workerRecord(uid);
      return sharedRecord(firstName, recordEntries(bookings, refs), recordJobs(jobs));
    },
  };
}

export type ReferenceService = ReturnType<typeof createReferenceService>;
