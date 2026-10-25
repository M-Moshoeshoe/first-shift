import { RULES } from "@/config/rules";
import type { CheckoutReason } from "./bookings";
import type { CheckInProblem, MarkPaidProblem } from "./day";
import type { EvidenceProblem } from "./evidence";
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
  method_not_offered: "They can't be paid that way. Choose one of the ways shown, which they picked on their profile.",
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
  methodHint: (name: string, phone: string) => `${name} chose these ways to be paid, to ${phone}.`,
  reference: "Payment reference",
  referenceHint: (name: string) => `Recommended. The reference on your payment, so ${name} can match it. Up to ${RULES.paymentReferenceMaxChars} characters.`,
  referenceTooLong: `The reference can be up to ${RULES.paymentReferenceMaxChars} characters. Make it shorter.`,
  cashHandover: (name: string) => `Hand over the cash, then ask ${name} to tap Received on their phone.`,
  paidTooMuch: "Paid too much? Don't ask for it back. Tap Report a problem and choose I paid too much: we'll sort it out.",
  amount: "Amount paid",
  amountHint: (owed: number, minimum: number) =>
    minimum < owed ? `${formatRand(owed)} is owed for the full day. You can lower it to the hours worked, not below ${formatRand(minimum)}.` : `${formatRand(owed)} is owed. You can pay more.`,
  amountInvalid: "Enter the amount in rand, like 210 or 210.00.",
  paid: "Paid",
  waitingAnswer: (name: string) => `Waiting for ${name} to confirm they received it.`,
  workerTitle: "Your pay",
  workerWaiting: (cents: number) => `You're owed ${formatRand(cents)}. The business pays you directly; you'll confirm here when it arrives.`,
  workerPaid: (business: string, cents: number, method: string) => `${business} says they paid you ${formatRand(cents)} by ${method}.`,
  workerReference: (reference: string) => `Payment reference: ${reference}`,
  overpaid: (owed: number) => `That's more than the ${formatRand(owed)} owed. You don't have to send anything back: if anyone asks you to, don't pay, and tap Report a problem.`,
  neverSendBack: "First Shift never asks you to send money back, and you never pay anyone to get a tryout. If someone asks, don't pay: tap Report a problem.",
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

/** The FNB eWallet balance codes, exactly as they're dialled. */
export const EWALLET_BALANCE_CODES = ["*120*277#", "*130*277#"] as const;

/** How to check a payment is real before tapping Received, for the method the owner used. */
export const BALANCE_CHECKS: Record<PaymentMethod, string> = {
  ewallet: `Check your eWallet balance before you answer: dial ${EWALLET_BALANCE_CODES[0]}, or the free ${EWALLET_BALANCE_CODES[1]}.`,
  payshap: "Check your banking app before you answer: the payment should be in your account already.",
  cash_send: "Check the SMS with the PIN before you answer. It's only real once an ATM or till pays it out, so draw it first.",
  cash: "Count the cash in person before you answer.",
};

/** A tryout from before methods were asked, with no method recorded. */
export const BALANCE_CHECK_ANY = "Check that the money has really arrived before you answer.";

/** Proof, only after Not received: one screenshot and a note from each side, seen only by the person reviewing it (evidence.ts). */
export const EVIDENCE_COPY = {
  title: "Show us what happened",
  hint: "Add one screenshot, such as your banking app or the cash-send SMS, with a note. Only the person reviewing this sees it.",
  file: "Your screenshot",
  note: "What it shows (optional)",
  noteTooLong: `Your note can be up to ${RULES.evidenceNoteMaxChars} characters. Make it shorter.`,
  choose: "Choose a screenshot first.",
  send: "Send proof",
  sending: "Sending your proof",
  sent: "Thanks. Your proof is with the person reviewing this.",
} as const;

export const EVIDENCE_MESSAGES: Record<EvidenceProblem, string> = {
  not_found: "We can't find that booking. Go back and check your tryouts.",
  not_disputed: "Proof is added only after the young person taps Not received.",
  already_added: "You've already sent your proof for this tryout.",
  not_an_image: "That file isn't a picture. Choose a screenshot saved as a JPEG, PNG or WebP image.",
  too_big: "That screenshot is bigger than 2 MB. Choose a smaller one.",
};
