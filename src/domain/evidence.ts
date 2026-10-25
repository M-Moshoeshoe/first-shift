import { RULES } from "@/config/rules";
import { partyOf, type BookingRecord } from "./bookings";
import type { Party } from "./cancellation";
import type { Viewer } from "./demo";

/*
 * Evidence, only in a dispute: once the young person says Not received, each
 * side may add one screenshot (a bank or eWallet screen, an SMS) and a note
 * for the person who reviews it. Never asked for in the normal flow. The
 * file goes to a private Storage path that only an admin can read.
 */

export type EvidenceType = "image/jpeg" | "image/png" | "image/webp";

/** What the file is, from its own first bytes, never from what the browser says it is. */
export function sniffImage(bytes: Uint8Array): EvidenceType | null {
  const starts = (...values: number[]) => values.every((value, index) => bytes[index] === value);
  if (starts(0xff, 0xd8, 0xff)) return "image/jpeg";
  if (starts(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a)) return "image/png";
  const ascii = (from: number, to: number) => String.fromCharCode(...bytes.slice(from, to));
  if (bytes.length >= 12 && ascii(0, 4) === "RIFF" && ascii(8, 12) === "WEBP") return "image/webp";
  return null;
}

/** Whether this side may add its screenshot now: after Not received, and once each. */
export const canAddEvidence = (party: Party, booking: Pick<BookingRecord, "payment" | "evidenceBy">): boolean =>
  booking.payment?.state === "not_received" && !(booking.evidenceBy ?? []).includes(party);

export type EvidenceProblem = "not_found" | "not_disputed" | "already_added" | "not_an_image" | "too_big";

export type EvidenceDecision = { kind: "add"; party: Party; contentType: EvidenceType } | { kind: "refuse"; problem: EvidenceProblem };

/** Someone else's booking reads as not found; a file that isn't a JPEG, PNG or WebP image under 2 MB is refused. */
export function decideEvidence(viewer: Viewer, booking: BookingRecord | null, bytes: Uint8Array): EvidenceDecision {
  const party = partyOf(viewer, booking);
  if (!party || !booking) return { kind: "refuse", problem: "not_found" };
  if (booking.payment?.state !== "not_received") return { kind: "refuse", problem: "not_disputed" };
  if (!canAddEvidence(party, booking)) return { kind: "refuse", problem: "already_added" };
  if (bytes.length >= RULES.photoMaxBytes) return { kind: "refuse", problem: "too_big" };
  const contentType = sniffImage(bytes);
  return contentType ? { kind: "add", party, contentType } : { kind: "refuse", problem: "not_an_image" };
}

/** The private path: built by the server from the booking and the side, with a random part so nothing is ever overwritten. */
export const evidencePath = (bookingId: string, party: Party, unique: string): string => `evidence/${bookingId}/${party}-${unique}`;
