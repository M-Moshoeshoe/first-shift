import { RULES } from "@/config/rules";
import { partyOf, type BookingRecord, type CheckoutReason, type Payment } from "./bookings";
import type { OwnerAnswers } from "./references";
import { bookingReview, type ReviewCase } from "./cases";
import type { Viewer } from "./demo";
import { isAcceptedAmount } from "./pay";
import { isElectronic, nextPaymentState, paidOnTime, paymentAction, PAYMENT_METHODS, type PaymentMethod } from "./paymentFlow";
import { settle, type SettleEvent, type Settlement } from "./settlement";
import { addMinutes, minutesBetween } from "./time";

/*
 * The day, from the door to Received (docs/RULES.md). Every amount comes from
 * settle() and pay.ts, so the credit is used or returned by the one rule
 * (docs/MONEY.md). Each function only decides; the service writes.
 */

const asOwner = (viewer: Viewer, booking: BookingRecord | null): booking is BookingRecord => partyOf(viewer, booking) === "business";
const asWorker = (viewer: Viewer, booking: BookingRecord | null): booking is BookingRecord => partyOf(viewer, booking) === "young_person";

export interface DoorCheck {
  code: string;
  faceMatches: boolean;
  nameMatches: boolean;
  lastFourMatches: boolean;
}

export type CheckInProblem = "not_found" | "not_booked" | "too_early" | "over" | "door_check" | "locked" | "wrong_code";

/**
 * The owner checks the young person in at the door: the face matches the
 * photo, the ID card's name and last four digits match, and the code they
 * show matches. Wrong codes are counted; after a few the booking locks, so a
 * code can't be guessed without the young person there.
 */
export function decideCheckIn(viewer: Viewer, booking: BookingRecord | null, secrets: { checkInCode: string; codeAttempts?: number } | null, check: DoorCheck, now: Date): { kind: "check_in" } | { kind: "unchanged" } | { kind: "refuse"; problem: CheckInProblem } {
  if (!asOwner(viewer, booking) || !secrets) return { kind: "refuse", problem: "not_found" };
  if (booking.status === "checked_in") return { kind: "unchanged" };
  if (booking.status !== "booked") return { kind: "refuse", problem: "not_booked" };
  if (now < addMinutes(booking.startAt, -RULES.checkInOpensMinutesBefore)) return { kind: "refuse", problem: "too_early" };
  if (now >= booking.endAt) return { kind: "refuse", problem: "over" };
  if (!check.faceMatches || !check.nameMatches || !check.lastFourMatches) return { kind: "refuse", problem: "door_check" };
  if ((secrets.codeAttempts ?? 0) >= RULES.checkInCodeAttempts) return { kind: "refuse", problem: "locked" };
  return check.code.replace(/\s+/g, "") === secrets.checkInCode ? { kind: "check_in" } : { kind: "refuse", problem: "wrong_code" };
}

export type DayEnding = { kind: "end"; settlement: Settlement; review: ReviewCase | null } | { kind: "unchanged" } | { kind: "refuse"; problem: "not_found" | "not_now" };

/** The owner marks a no-show, from 30 minutes after the start, if nobody checked in. Nothing is owed, the credit comes back, and it goes to review. */
export function decideNoShow(viewer: Viewer, bookingId: string, booking: BookingRecord | null, now: Date): DayEnding {
  if (!asOwner(viewer, booking)) return { kind: "refuse", problem: "not_found" };
  if (booking.status === "no_show") return { kind: "unchanged" };
  if (booking.status !== "booked" || now < addMinutes(booking.startAt, RULES.noShowAfterMinutes)) return { kind: "refuse", problem: "not_now" };
  return { kind: "end", settlement: settle({ kind: "worker_no_show" }), review: bookingReview("no_show_marked", { bookingId, ...booking }) };
}

/** The young person says the business wasn't open, any time after the start if nobody checked them in. It goes to review; nothing is settled until then. */
export function decideBusinessNotOpen(viewer: Viewer, bookingId: string, booking: BookingRecord | null, now: Date): { kind: "review"; review: ReviewCase } | { kind: "refuse"; problem: "not_found" | "not_now" } {
  if (!asWorker(viewer, booking)) return { kind: "refuse", problem: "not_found" };
  if (booking.status !== "booked" || now < booking.startAt) return { kind: "refuse", problem: "not_now" };
  return { kind: "review", review: bookingReview("business_not_open", { bookingId, ...booking }) };
}

/** Checked in no later than this counts as on time, towards the show-up record (showUp.ts). */
export const wasOnTime = (booking: Pick<BookingRecord, "startAt" | "checkedInAt">): boolean =>
  Boolean(booking.checkedInAt && booking.checkedInAt <= addMinutes(booking.startAt, RULES.onTimeGraceMinutes));

/**
 * The owner checks out with how the day ended and their three answers (on
 * time, did the work, would hire again), which the reference is written
 * from. settle() works out what's owed (pay.ts): the full amount, or for
 * leaving early or a safety stop the hours worked, never under 4. A safety
 * stop goes to review.
 */
export function decideCheckOut(viewer: Viewer, bookingId: string, booking: BookingRecord | null, reason: CheckoutReason, answers: OwnerAnswers, now: Date): DayEnding & { minutesWorked?: number; answers?: OwnerAnswers } {
  if (!asOwner(viewer, booking)) return { kind: "refuse", problem: "not_found" };
  if (booking.status === "ended") return { kind: "unchanged" };
  if (booking.status !== "checked_in" || !booking.checkedInAt) return { kind: "refuse", problem: "not_now" };
  const minutesWorked = Math.max(0, Math.round(minutesBetween(booking.checkedInAt, now)));
  const terms = { rateCentsPerHour: booking.rateCentsPerHour, agreedHours: booking.hours };
  const event: SettleEvent = reason === "worker_left_early" || reason === "safety" ? { kind: reason, ...terms, minutesWorked } : { kind: reason, ...terms };
  const review = reason === "safety" ? bookingReview("safety_stop", { bookingId, ...booking }) : null;
  return { kind: "end", settlement: settle(event), review, minutesWorked, answers: { onTime: answers.onTime, didTheWork: answers.didTheWork, wouldHireAgain: answers.wouldHireAgain } };
}

/** A booking with money owed: ended, or cancelled late by the business. */
export const isPayable = (booking: BookingRecord): boolean => (booking.status === "ended" || booking.status === "cancelled") && (booking.owedCents ?? 0) > 0;

/** When the payment was due: check-out, or the late cancellation. The owner has until 23:59 that day (paymentFlow.ts). */
export const dueFrom = (booking: BookingRecord): Date | null => booking.ended?.at ?? booking.cancellation?.at ?? null;

/** The methods the owner may pay by: the ones the young person chose. A booking from before they were asked takes any. */
export const methodsFor = (booking: Pick<BookingRecord, "workerPayMethods">): readonly PaymentMethod[] =>
  booking.workerPayMethods?.length ? booking.workerPayMethods : PAYMENT_METHODS;

export type MarkPaidProblem = "not_found" | "not_payable" | "below_minimum" | "method_not_offered";

export interface MarkPaid {
  method: PaymentMethod;
  amountCents: number;
  /** As the owner's bank shows it; kept for an electronic payment only. */
  reference?: string;
}

/**
 * The owner sends the payment themselves, by a method the young person
 * accepts, then taps Paid with the method and the amount: at least what's
 * owed, more is always fine. A reference is kept only for an electronic payment.
 */
export function decideMarkPaid(viewer: Viewer, booking: BookingRecord | null, paid: MarkPaid, now: Date): { kind: "paid"; payment: Payment } | { kind: "unchanged" } | { kind: "refuse"; problem: MarkPaidProblem } {
  if (!asOwner(viewer, booking)) return { kind: "refuse", problem: "not_found" };
  if (!isPayable(booking)) return { kind: "refuse", problem: "not_payable" };
  const state = booking.payment?.state ?? "awaiting_payment";
  if (state !== "awaiting_payment") return { kind: "unchanged" };
  if (!methodsFor(booking).includes(paid.method)) return { kind: "refuse", problem: "method_not_offered" };
  const owed = { amountCents: booking.owedCents ?? 0, minimumCents: booking.owedMinimumCents ?? booking.owedCents ?? 0, needsReview: false };
  if (!isAcceptedAmount(paid.amountCents, owed)) return { kind: "refuse", problem: "below_minimum" };
  const next = nextPaymentState(state, "owner_marked_paid");
  if (!next) return { kind: "unchanged" };
  const reference = isElectronic(paid.method) ? paid.reference?.trim().slice(0, RULES.paymentReferenceMaxChars) : undefined;
  return { kind: "paid", payment: { state: next, method: paid.method, amountCents: paid.amountCents, markedPaidAt: now, ...(reference ? { reference } : {}) } };
}

export type PayCounter = "payments" | "paidOnTime";

/**
 * How one tryout's payment counts towards the business's "Paid on time: N of
 * N" line, once only: on Received, on time when it was marked paid by 23:59
 * on the day it was due; as late when the business was paused unpaid, or the
 * young person said Not received. Null once it has been counted.
 */
export function payRecordCounters(booking: BookingRecord, outcome: "received" | "not_received" | "paused_unpaid"): PayCounter[] | null {
  if (booking.payCounted) return null;
  const due = dueFrom(booking);
  const markedAt = booking.payment?.markedPaidAt;
  const onTime = outcome === "received" && due !== null && markedAt !== undefined && paidOnTime(due, markedAt);
  return onTime ? ["payments", "paidOnTime"] : ["payments"];
}

/** The young person checks their real balance, then answers. Not received goes to review at once. */
export function decideConfirm(viewer: Viewer, bookingId: string, booking: BookingRecord | null, received: boolean, now: Date): { kind: "answer"; payment: Payment; review: ReviewCase | null } | { kind: "unchanged" } | { kind: "refuse"; problem: "not_found" | "not_paid_yet" } {
  if (!asWorker(viewer, booking)) return { kind: "refuse", problem: "not_found" };
  const payment = booking.payment;
  if (payment?.state === "received" || payment?.state === "not_received") return { kind: "unchanged" };
  const next = payment ? nextPaymentState(payment.state, received ? "worker_confirmed_received" : "worker_reported_not_received") : null;
  if (!payment || !next) return { kind: "refuse", problem: "not_paid_yet" };
  return { kind: "answer", payment: { ...payment, state: next, answeredAt: now }, review: received ? null : bookingReview("not_received", { bookingId, ...booking }) };
}

export interface DeadlineActions {
  /** Unpaid by 23:59 on the day: the business is paused from 00:00 until it pays. */
  pauseBusiness: boolean;
  /** Marked paid a day ago with no answer: the young person sees a reminder. */
  remindWorker: boolean;
  /** Three days with no answer: a person looks at it, once. */
  review: ReviewCase | null;
}

/**
 * What the payment deadlines call for right now (paymentFlow.ts). Worked out
 * from the clock whenever either party opens a screen, so nothing has to run
 * in the background, and each action happens once.
 */
export function deadlineActions(bookingId: string, booking: BookingRecord, businessPausedFor: string | null, now: Date): DeadlineActions {
  const none: DeadlineActions = { pauseBusiness: false, remindWorker: false, review: null };
  const from = dueFrom(booking);
  if (!isPayable(booking) || !from) return none;
  const payment = booking.payment ?? { state: "awaiting_payment" as const };
  const action = paymentAction(payment.state, now, from, payment.markedPaidAt);
  if (action === "pause_business") return { ...none, pauseBusiness: businessPausedFor !== unpaidPause(bookingId) };
  if (action === "remind_worker") return { ...none, remindWorker: true };
  // Not received opens its review when the young person answers (decideConfirm); this is the 72-hour silence.
  if (action === "send_to_review" && payment.state === "awaiting_confirmation" && !booking.reviewOpened) return { ...none, review: bookingReview("unconfirmed", { bookingId, ...booking }) };
  return none;
}

/** What each party can do on the day, right now: the booking page shows only these. */
export function dayOptions(party: "business" | "young_person", booking: BookingRecord, now: Date) {
  const isOwner = party === "business";
  const booked = booking.status === "booked";
  return {
    canCheckIn: isOwner && booked && now >= addMinutes(booking.startAt, -RULES.checkInOpensMinutesBefore) && now < booking.endAt,
    canNoShow: isOwner && booked && now >= addMinutes(booking.startAt, RULES.noShowAfterMinutes),
    canReportNotOpen: !isOwner && booked && now >= booking.startAt,
    canCheckOut: isOwner && booking.status === "checked_in",
    payable: isPayable(booking),
  };
}

/** What a business paused for an unpaid tryout is paused for; paying that tryout lifts it. */
export const unpaidPause = (bookingId: string): string => `unpaid:${bookingId}`;
