import { RULES } from "@/config/rules";
import type { CheckoutReason } from "./bookings";
import type { CheckInProblem, MarkPaidProblem } from "./day";
import { formatRand } from "./money";
import type { PaymentMethod } from "./paymentFlow";

/*
 * Every sentence on the day: the door, check-in, no-shows, check-out, paying
 * and confirming. "Contact us" becomes a support link (messages.ts). Copy
 * rules: AGENTS.md.
 */

export const CHECK_IN_MESSAGES: Record<CheckInProblem, string> = {
  not_found: "We can't find that booking. Go back and check your tryouts.",
  not_booked: "This booking isn't waiting for a check-in any more.",
  too_early: `Check-in opens ${RULES.checkInOpensMinutesBefore} minutes before the start. Try again closer to the time.`,
  over: "This tryout's time has passed, so it can't be checked in now. Contact us if they worked it.",
  door_check: "Check all three at the door before you check them in: their face, the name on their ID card and its last four digits.",
  locked: "Too many wrong codes have been tried on this booking, so check-in is locked. Contact us to sort it out.",
  wrong_code: "That code doesn't match. Ask them for the code on their booking page and type it again.",
};

export const MARK_PAID_MESSAGES: Record<MarkPaidProblem, string> = {
  not_found: "We can't find that booking. Go back and check your tryouts.",
  not_payable: "There's nothing to pay on this booking yet. Check them out first.",
  below_minimum: "That's less than what's owed. Enter at least the amount shown; paying more is fine.",
};

export const DAY_COPY = {
  doorTitle: "At the door",
  doorHint: "Check these before you let them start. Nobody else should do the tryout in their place.",
  face: "Their face matches the photo",
  name: (name: string) => `The name on their ID card is ${name}`,
  lastFour: (digits: string) => `The last four digits of their ID number are ${digits}`,
  code: "Their check-in code",
  codeHint: "Six digits, on their booking page.",
  checkIn: (name: string) => `Check in ${name}`,
  checkedIn: (time: string) => `Checked in at ${time}.`,
  noShow: (name: string) => `${name} didn't arrive`,
  noShowConfirm: (name: string) => `This records a no-show for ${name} and sends it to review. Your credit comes back.`,
  noShowYes: "Yes, record a no-show",
  noShowDone: "Recorded as a no-show. We'll look at it and contact you both if we need to.",
  notOpen: "The business wasn't open",
  notOpenConfirm: "Tell us the business wasn't open when you got there. We'll look into it and contact you; if it's confirmed, they owe you 4 hours' pay.",
  notOpenYes: "Yes, tell First Shift",
  notOpenDone: "Thanks. We're looking into it and will contact you.",
  checkOutTitle: "Check out",
  checkOutLegend: "How did the day end?",
  checkOut: "Check out",
  owe: (name: string, cents: number) => `You owe ${name} ${formatRand(cents)}.`,
  safetyReview: "A safety stop always goes to review. We'll contact you both.",
  payTitle: "Pay",
  methodLegend: "How did you pay?",
  amount: "Amount paid",
  amountHint: (owed: number, minimum: number) =>
    minimum < owed ? `${formatRand(owed)} is owed for the full day. You can lower it to the hours worked, not below ${formatRand(minimum)}.` : `${formatRand(owed)} is owed. You can pay more.`,
  amountInvalid: "Enter the amount in rand, like 210 or 210.00.",
  paid: "Paid",
  waitingAnswer: (name: string) => `Waiting for ${name} to confirm they received it.`,
  workerTitle: "Your pay",
  workerWaiting: (cents: number) => `You're owed ${formatRand(cents)}. The business pays you directly; you'll confirm here when it arrives.`,
  workerPaid: (business: string, cents: number, method: string) => `${business} says they paid you ${formatRand(cents)} by ${method}.`,
  checkBalance: "Check your real balance before you answer: dial *120*277# (or the free *130*277#) for FNB eWallet, check your bank app, or count the cash.",
  received: "Received",
  notReceived: "Not received",
  receivedDone: "Received. Your reference comes next.",
  notReceivedDone: "We've opened a review and will contact you both. The business stays paused until it's sorted out.",
  reminder: (business: string) => `${business} marked this paid a day ago. Check your balance and tell us whether it arrived.`,
} as const;

export const CHECKOUT_LABELS: Record<CheckoutReason, (name: string) => string> = {
  completed: () => "We finished the work",
  finished_early: () => "The work was done early",
  worker_left_early: (name) => `${name} chose to leave early`,
  business_ended_early: () => "I ended it early",
  safety: () => "Ended for safety",
};

export const METHOD_LABELS: Record<PaymentMethod, string> = {
  ewallet: "FNB eWallet",
  bank_transfer: "Bank transfer",
  cash: "Cash",
};
