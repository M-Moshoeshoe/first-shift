import { RULES } from "@/config/rules";
import { addHours, addMinutes, atSastTime } from "./time";

/**
 * The four ways a business pays, directly and by its own means (docs/MONEY.md):
 * FNB eWallet, PayShap and a cash-send from its own bank, each to the young
 * person's cellphone number, or cash in person. Never a bank account number.
 */
export const PAYMENT_METHODS = ["ewallet", "payshap", "cash_send", "cash"] as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

/** Every method but cash leaves a reference the young person can match. */
export const isElectronic = (method: PaymentMethod): boolean => method !== "cash";

export type PaymentState = "awaiting_payment" | "awaiting_confirmation" | "received" | "not_received";

export type PaymentEvent = "owner_marked_paid" | "worker_confirmed_received" | "worker_reported_not_received";

const TRANSITIONS: Record<PaymentState, Partial<Record<PaymentEvent, PaymentState>>> = {
  awaiting_payment: { owner_marked_paid: "awaiting_confirmation" },
  awaiting_confirmation: { worker_confirmed_received: "received", worker_reported_not_received: "not_received" },
  received: {},
  not_received: {},
};

/** Returns the next state, or null when the event isn't allowed from this state. */
export function nextPaymentState(state: PaymentState, event: PaymentEvent): PaymentState | null {
  return TRANSITIONS[state][event] ?? null;
}

/** The reference is only ever issued after the young person confirms they were paid. */
export const referenceAllowed = (state: PaymentState): boolean => state === "received";

export type PaymentAction = "none" | "pause_business" | "remind_worker" | "send_to_review";

/**
 * Payment is due at check-out, and the owner has until 23:59 South African
 * time that same day to mark it paid. Returns the first instant that is late:
 * 00:00 SAST the next day.
 */
export function payDeadline(checkedOutAt: Date): Date {
  const { hour, minute } = RULES.ownerPayDeadlineSast;
  return addMinutes(atSastTime(checkedOutAt, hour, minute), 1);
}

/** Whether the owner marked the tryout paid in time: any moment up to and including 23:59 SAST on the day. */
export const paidOnTime = (checkedOutAt: Date, markedPaidAt: Date): boolean => markedPaidAt < payDeadline(checkedOutAt);

/** What the system should do now, given how long each side has been waiting. */
export function paymentAction(state: PaymentState, now: Date, checkedOutAt: Date, markedPaidAt?: Date): PaymentAction {
  if (state === "awaiting_payment") {
    return now >= payDeadline(checkedOutAt) ? "pause_business" : "none";
  }
  if (state === "not_received") return "send_to_review";
  if (state === "awaiting_confirmation" && markedPaidAt) {
    if (now > addHours(markedPaidAt, RULES.payConfirmReviewHours)) return "send_to_review";
    if (now > addHours(markedPaidAt, RULES.payConfirmReminderHours)) return "remind_worker";
  }
  return "none";
}
