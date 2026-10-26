import type { BookingRecord } from "./bookings";
import type { ReviewCase } from "./cases";

/**
 * A reference, from the owner's three answers (the fixed criteria) and the
 * tasks, with the wording written with AI. The young person reviews every one
 * before it can be shared: they add it to their record, or challenge it.
 */
// withdrawn: a challenge upheld on review takes it off for good; the owner can't rewrite it.
export const REFERENCE_STATUSES = ["draft", "approved", "challenged", "withdrawn"] as const;
export type ReferenceStatus = (typeof REFERENCE_STATUSES)[number];

/** The owner's three one-tap answers: the same criteria for every reference. */
export interface OwnerAnswers {
  onTime: boolean;
  didTheWork: boolean;
  wouldHireAgain: boolean;
}

/** references/{bookingId}: one per completed tryout, written once and never by the owner. */
export interface ReferenceRecord {
  workerId: string;
  ownerId: string;
  tryoutId: string;
  answers: OwnerAnswers;
  tasks: string[];
  /** The wording, written with AI from the answers and tasks only, and labelled so. */
  text: string;
  status: ReferenceStatus;
  demo: boolean;
  /** A challenge rejected on review: it's back with the young person to add or leave off, and can't be challenged again. */
  challengeRejected?: boolean;
}

export type DraftProblem = "not_found" | "not_received" | "no_answers";

/**
 * Whether a reference can be written now: only for the young person it's
 * about, only after they confirmed Received, and only from the owner's
 * answers. Null means write it; a booking with one already changes nothing.
 */
export function referenceDraftProblem(uid: string, booking: BookingRecord | null): DraftProblem | null {
  if (!booking || booking.workerId !== uid) return "not_found";
  if (booking.payment?.state !== "received") return "not_received";
  return booking.ended?.answers ? null : "no_answers";
}

/** The reference to store: the answers and tasks it was written from, and the AI's wording, as a draft for the young person. */
export function newReference(booking: BookingRecord, tasks: readonly string[], text: string): ReferenceRecord | null {
  const answers = booking.ended?.answers;
  if (!answers) return null;
  return { workerId: booking.workerId, ownerId: booking.ownerId, tryoutId: booking.tryoutId, answers, tasks: [...tasks], text: text.trim(), status: "draft", demo: booking.demo };
}

export type ReferenceDecision =
  | { kind: "approve" }
  | { kind: "challenge"; reviewCase: ReviewCase }
  | { kind: "unchanged" }
  | { kind: "refuse"; problem: "not_found" | "already_decided" };

/**
 * Only the young person the reference is about may decide, and only once
 * while it's a draft. Someone else's reference reads as not found. The same
 * choice twice changes nothing. A challenge opens a review case; until it's
 * resolved the reference stays off the record.
 */
export function decideReference(uid: string, reference: ReferenceRecord | null, referenceId: string, choice: { action: "approve" } | { action: "challenge"; reason: string }): ReferenceDecision {
  if (!reference || reference.workerId !== uid) return { kind: "refuse", problem: "not_found" };
  const target = choice.action === "approve" ? "approved" : "challenged";
  if (reference.status === target) return { kind: "unchanged" };
  if (reference.status !== "draft") return { kind: "refuse", problem: "already_decided" };
  if (choice.action === "approve") return { kind: "approve" };
  if (reference.challengeRejected) return { kind: "refuse", problem: "already_decided" };
  return {
    kind: "challenge",
    reviewCase: { kind: "reference_challenge", referenceId, workerId: uid, ownerId: reference.ownerId, reason: choice.reason.trim(), status: "open" },
  };
}

/** What the shareable record shows: approved references only. */
export const shareableReferences = <T extends Pick<ReferenceRecord, "status">>(references: readonly T[]): T[] => references.filter((reference) => reference.status === "approved");
