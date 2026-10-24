import { RULES } from "@/config/rules";
import { addHours } from "./time";

export type PaymentMethod = "ewallet" | "bank_transfer" | "cash";

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

/** What the system should do now, given how long each side has been waiting. */
export function paymentAction(state: PaymentState, now: Date, checkedOutAt: Date, markedPaidAt?: Date): PaymentAction {
  if (state === "awaiting_payment") {
    return now > addHours(checkedOutAt, RULES.ownerPayDeadlineHours) ? "pause_business" : "none";
  }
  if (state === "not_received") return "send_to_review";
  if (state === "awaiting_confirmation" && markedPaidAt) {
    if (now > addHours(markedPaidAt, RULES.payConfirmReviewHours)) return "send_to_review";
    if (now > addHours(markedPaidAt, RULES.payConfirmReminderHours)) return "remind_worker";
  }
  return "none";
}
