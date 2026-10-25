import "server-only";
import type { Viewer } from "@/domain/demo";
import { EVIDENCE_MESSAGES } from "@/domain/dayMessages";
import { decideEvidence, evidencePath, type EvidenceProblem } from "@/domain/evidence";
import { AppError } from "../errors";
import { log } from "../log";
import type { BookingRepository } from "../repositories/bookingRepository";
import type { EvidenceStore } from "../repositories/photoStore";

const HTTP_STATUS: Record<EvidenceProblem, number> = { not_found: 404, not_disputed: 409, already_added: 409, not_an_image: 422, too_big: 422 };

function refuse(bookingId: string, problem: EvidenceProblem): AppError {
  log("warn", "evidence_refused", { bookingId, problem });
  return new AppError(HTTP_STATUS[problem], problem, EVIDENCE_MESSAGES[problem]);
}

/**
 * One side's proof after Not received (evidence.ts). Decided first, so a
 * refusal stores nothing; then the file goes to its private path, and one
 * transaction decides again and records it with its audit entry. A file
 * whose record couldn't be written is removed, so nothing is left behind.
 */
export async function addEvidence(
  deps: { bookings: BookingRepository; evidence: EvidenceStore; newId: () => string },
  viewer: Viewer,
  bookingId: string,
  bytes: Uint8Array,
  note: string,
): Promise<{ status: "done" }> {
  const found = await deps.bookings.get(bookingId);
  const first = decideEvidence(viewer, found?.booking ?? null, bytes);
  if (first.kind === "refuse") throw refuse(bookingId, first.problem);
  const path = evidencePath(bookingId, first.party, deps.newId());
  await deps.evidence.save(path, bytes, first.contentType);
  try {
    return await deps.bookings.transactBooking<{ status: "done" }>(bookingId, viewer.uid, ({ booking }) => {
      const decision = decideEvidence(viewer, booking, bytes);
      if (decision.kind === "refuse" || !booking) throw refuse(bookingId, decision.kind === "refuse" ? decision.problem : "not_found");
      const record = { bookingId, party: decision.party, uid: viewer.uid, path, contentType: decision.contentType, size: bytes.length, note: note.trim(), demo: booking.demo };
      return { write: { booking: { evidenceBy: [...(booking.evidenceBy ?? []), decision.party] }, evidence: record, audit: "evidence_added" }, result: { status: "done" } };
    });
  } catch (error) {
    await deps.evidence.remove(path).catch(() => log("error", "evidence_cleanup_failed", { bookingId }));
    throw error;
  }
}
