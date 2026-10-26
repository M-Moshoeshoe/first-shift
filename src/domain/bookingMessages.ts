import { RULES } from "@/config/rules";
import type { AcceptProblem, OfferProblem } from "./offers";
import type { ApplicationStatus } from "./applications";
import type { ReportCategory } from "./cases";
import { formatRand } from "./money";
import { BOOKING_MESSAGES } from "./tryoutMessages";

/*
 * Every sentence about offers, bookings, cancelling and reporting. "Contact
 * us" becomes a support link (messages.ts, splitContactLink). Copy rules: AGENTS.md.
 */

export const OFFER_PROBLEM_MESSAGES: Record<OfferProblem, string> = {
  not_found: "We can't find that tryout. Go back to your tryouts and check.",
  not_open: `Offers close ${RULES.bookingCutoffMinutes / 60} hour before the start, so nobody is booked who can't get there. This tryout can't be offered any more.`,
  offer_pending: "You've already offered this tryout to someone. Wait for their answer: if they decline, you can offer it to someone else.",
  not_applicant: "That person isn't waiting on this tryout any more. Choose someone else from the list.",
};

export const ANSWER_PROBLEM_MESSAGES: Record<AcceptProblem | "not_found", string> = {
  not_found: "We can't find that offer. Go back to Applications and check.",
  no_offer: "There's no offer waiting for you on this tryout. Check Applications.",
  lapsed: "This offer has ended: offers close an hour before the start. Look for another tryout.",
  no_credits: "The business can't take a booking right now. We've told them; look for another tryout in the meantime.",
  overlaps_booking: "You're already booked on a tryout at this time, so you can't accept this one.",
  regular_employment: BOOKING_MESSAGES.regularEmployment,
};

export const APPLICATION_LABELS: Record<ApplicationStatus, string> = {
  applied: "Applied",
  offered: "Offered to you",
  booked: "Booked",
  not_selected: "Not selected",
  withdrawn: "Withdrawn",
  declined: "You declined",
  cancelled: "Cancelled",
};

export const APPLICATIONS_COPY = {
  title: "Your applications",
  intro: "Where each tryout you applied for stands. Tap one to see it.",
  empty: "You haven't applied for any tryouts yet. Find one under Tryouts.",
  offerEnded: "Offer ended",
};

export const OWNER_COPY = {
  applicantsTitle: "Who applied",
  noApplicants: "Nobody has applied yet. Young people nearby can see this tryout now.",
  shortlist: "Your shortlist",
  others: "Everyone else",
  firstTimer: "First tryout: we keep one place on every shortlist for someone starting out.",
  fitNote: "Ranked by whether each person says they can do this kind of work, how likely they are to turn up, and how far they travel.",
  canDo: "Says they can do this kind of work",
  skills: "What they can do",
  languages: "Languages",
  offer: (name: string) => `Offer the tryout to ${name}`,
  offered: (name: string, until: string) => `Offered to ${name}. They have until ${until} to answer.`,
  booked: (name: string) => `Booked: ${name}.`,
  seeBooking: "See the booking",
  completed: (count: number) => `Tryouts done: ${count}`,
  references: (count: number) => `References: ${count}`,
  showUp: (score: number) => `Likely to show up: ${score} out of 100`,
  note: "Their note",
  returnFare: (cents: number) => `Return taxi ${formatRand(cents)}`,
};

export const OFFER_COPY = {
  offeredTitle: "You've been offered this tryout",
  offered: (until: string) => `Accept it to be booked, or decline so the business can offer it to someone else. The offer ends at ${until}.`,
  accept: "Accept",
  decline: "Decline",
  booked: "You're booked",
  seeBooking: "See your booking",
  notSelected: "The business picked someone else for this one. Keep applying: there are other tryouts near you.",
};

export const BOOKING_COPY = {
  where: "Where",
  pin: (metres: number) => `Pinned to within ${Math.max(1, Math.ceil(metres))} metres of the door.`,
  openMaps: "Open in maps",
  code: "Your check-in code",
  codeHint: "Show it to the owner at the door. They check your face and your ID card, then enter it.",
  payoutPhone: "Their number for payments",
  payment: "You send the payment yourself, from your FNB app, your bank or in cash. First Shift doesn't move money. It records the payment, and the young person confirms they received it.",
  payMethods: "How they can be paid",
  chat: "Chat on WhatsApp",
  ownerTitle: (name: string) => `${name}, the owner`,
  ownerHint: "Ask for them when you arrive. They check your ID at the door.",
  chatHint: (name: string) => `${name} can message you on WhatsApp at your number for payments.`,
  share: "Share my trip",
  shareHint: "Send a trusted person a link that shows where you'll be and how the day is going. It stops working the next day.",
  shareText: (business: string, area: string, when: string, link: string) => `I'm doing a paid tryout at ${business} in ${area}, ${when}. You can see how it's going here: ${link}`,
  report: "Report a problem",
  cancel: "Cancel this tryout",
  cancelConfirm: "Yes, cancel it",
  keep: "Keep the booking",
  cancelFree: "Cancelling now is free.",
  cancelLate: (owedCents: number) =>
    owedCents > 0 ? `Cancelling now is late: it counts as a strike, and you'll owe them ${formatRand(owedCents)} for the 4 hours.` : "Cancelling now is late: it counts as a strike against you.",
  cancelled: "This booking is cancelled.",
  started: "This tryout has started, so it can't be cancelled.",
  notFound: "We can't find that booking. Go back and check your tryouts.",
};

export const REPORT_COPY = {
  legend: "What happened?",
  categoryMissing: "Choose what happened.",
  note: "Tell us more (optional)",
  noteHint: "Only the First Shift team reads this.",
  send: "Send report",
  sent: "Thanks. Your report is with the First Shift team, and we'll contact you about it.",
  sentPaused: "Thanks. Your report is with the First Shift team. The business is paused until we've looked into it.",
  emergency: "If you're in danger now, call 10111 for the police, or 112 from a cellphone.",
};

export const REPORT_LABELS: Record<ReportCategory, string> = {
  harassment: "Harassment",
  unsafe_work: "Unsafe work",
  asked_for_money: "They asked me for money",
  not_paid: "Not paid",
  paid_too_much: "I paid too much",
  other: "Something else",
};
