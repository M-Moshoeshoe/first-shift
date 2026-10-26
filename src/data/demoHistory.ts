import { newBooking, type BookingRecord } from "@/domain/bookings";
import type { CreditEntry } from "@/domain/credits";
import type { BusinessRecord, UserRecord } from "@/domain/profile";
import { newReference, type ReferenceRecord } from "@/domain/references";
import { addDays, addMinutes, atSastTime } from "@/domain/time";
import type { TryoutRecord } from "@/domain/tryoutDecisions";

/**
 * Sipho and Thabo's history before the judge arrives: two tryouts this
 * month, worked, paid by eWallet and confirmed Received, so the work record
 * and its share link have something on them. The first has an approved
 * reference; the second has none yet, so a judge can tap Write my reference.
 * A third tryout together brings up "Offer Thabo a job" (hire.ts).
 */
export interface PastTryout {
  tryoutId: string;
  bookingId: string;
  tryout: TryoutRecord;
  booking: BookingRecord;
  reference: ReferenceRecord | null;
}

const ANSWERS = { onTime: true, didTheWork: true, wouldHireAgain: true };

/**
 * Written by hand for the demo, from the same three answers and the tasks a
 * real one is written from, in the style the model writes them (prompts.ts).
 */
const SEEDED_REFERENCE =
  "Thabo arrived on time and did the work as asked: greeting customers, writing repairs in the book and keeping the phone cases neat on the shelves. Sipho's Phone Repairs would hire Thabo again.";

/** A tryout from the demo's own builder, moved into the past and finished: its day happened, the booking ended and the money was confirmed. */
function finished(tryout: TryoutRecord, daysAgo: number): TryoutRecord {
  const startAt = atSastTime(addDays(tryout.startAt, -daysAgo), 9, 0);
  return { ...tryout, startAt, endAt: addMinutes(startAt, tryout.hours * 60), status: "completed" };
}

function paidAndReceived(tryoutId: string, tryout: TryoutRecord, business: BusinessRecord, workerId: string, worker: UserRecord): BookingRecord {
  const booking = newBooking(tryoutId, tryout, business, workerId, worker, addDays(tryout.startAt, -2));
  if (!booking) throw new Error("the demo profiles always make a booking");
  const endedAt = tryout.endAt;
  return {
    ...booking,
    status: "ended",
    checkedInAt: addMinutes(tryout.startAt, -5),
    ended: { at: endedAt, reason: "completed", minutesWorked: tryout.hours * 60, answers: ANSWERS },
    owedCents: tryout.payCents,
    owedMinimumCents: tryout.payCents,
    payment: { state: "received", method: "ewallet", amountCents: tryout.payCents, reference: "First Shift tryout", markedPaidAt: addMinutes(endedAt, 10), answeredAt: addMinutes(endedAt, 30) },
    payCounted: true,
  };
}

/** The two past tryouts, from two of the demo's tryout shapes, with the ids the store will give them. */
export function pastTryouts(shapes: readonly [TryoutRecord, TryoutRecord], ids: readonly [string, string, string, string], business: BusinessRecord, workerId: string, worker: UserRecord): PastTryout[] {
  const [firstShape, secondShape] = shapes;
  const [firstTryoutId, firstBookingId, secondTryoutId, secondBookingId] = ids;
  return [
    { tryoutId: firstTryoutId, bookingId: firstBookingId, shape: firstShape, daysAgo: 6, withReference: true },
    { tryoutId: secondTryoutId, bookingId: secondBookingId, shape: secondShape, daysAgo: 3, withReference: false },
  ].map(({ tryoutId, bookingId, shape, daysAgo, withReference }) => {
    const tryout = { ...finished(shape, daysAgo), bookingId };
    const booking = paidAndReceived(tryoutId, tryout, business, workerId, worker);
    const draft = withReference ? newReference(booking, tryout.tasks, SEEDED_REFERENCE) : null;
    return { tryoutId, bookingId, tryout, booking, reference: draft ? { ...draft, status: "approved" } : null };
  });
}

/** The business's ledger for its history: each past tryout held a credit and used it (settlement.ts). */
export const pastLedger = (past: readonly PastTryout[]): CreditEntry[] =>
  past.flatMap((entry): CreditEntry[] => [
    { kind: "hold", tryoutId: entry.tryoutId },
    { kind: "use", tryoutId: entry.tryoutId },
  ]);
