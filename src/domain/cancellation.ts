import { RULES } from "@/config/rules";
import { addHours, addMinutes } from "./time";

export type CancellationKind = "free" | "late" | "after_start";
export type Party = "young_person" | "business";

export interface CancellationInput {
  now: Date;
  bookedAt: Date;
  start: Date;
  /** Free cancellations this party made in the last 30 days that relied on the grace period. */
  recentGraceCancels: number;
}

/**
 * Free cancellation lasts until 12 hours before the start, or until 15 minutes
 * after booking, whichever is later. Bookings close an hour before the start,
 * so the grace period always ends well before anyone is due to arrive.
 */
export function freeCancelUntil(bookedAt: Date, start: Date): Date {
  const twelveHoursBefore = addHours(start, -RULES.freeCancelBeforeStartHours);
  const graceEnds = addMinutes(bookedAt, RULES.freeCancelGraceMinutes);
  const until = twelveHoursBefore > graceEnds ? twelveHoursBefore : graceEnds;
  return until < start ? until : start;
}

/** True when a free cancellation is only free because of the grace period. */
export function reliesOnGrace(now: Date, start: Date): boolean {
  return now > addHours(start, -RULES.freeCancelBeforeStartHours);
}

export function classifyCancellation({ now, bookedAt, start, recentGraceCancels }: CancellationInput): CancellationKind {
  if (now >= start) return "after_start";
  if (now > freeCancelUntil(bookedAt, start)) return "late";
  const graceAbused = reliesOnGrace(now, start) && recentGraceCancels >= RULES.graceCancelsPer30Days;
  return graceAbused ? "late" : "free";
}

export interface CancellationConsequence {
  strike: boolean;
  /** A business that cancels late owes the young person the four-hour minimum. */
  businessOwesMinimum: boolean;
}

export function cancellationConsequence(party: Party, kind: CancellationKind): CancellationConsequence {
  if (kind === "free") return { strike: false, businessOwesMinimum: false };
  return { strike: true, businessOwesMinimum: party === "business" };
}
