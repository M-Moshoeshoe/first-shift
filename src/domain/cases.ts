/**
 * Review cases: everything a person on the team must look at: a young person
 * challenging a reference (references.ts), a report about a tryout from
 * either side, the day's own reviews, and a business asking for more credits. Opening a case never decides it; a person
 * does, on review.
 */
export const REPORT_CATEGORIES = ["harassment", "unsafe_work", "asked_for_money", "not_paid", "paid_too_much", "other"] as const;
export type ReportCategory = (typeof REPORT_CATEGORIES)[number];

/**
 * What each side can report. A young person can say a business asked them for
 * money, which never happens on a real tryout; a business that paid too much
 * reports it, because overpayments are settled only by review, never by asking
 * the young person to send money back (docs/RULES.md, Scam rules).
 */
export function reportCategoriesFor(party: "business" | "young_person"): readonly ReportCategory[] {
  return party === "young_person" ? ["harassment", "unsafe_work", "asked_for_money", "not_paid", "other"] : ["harassment", "unsafe_work", "paid_too_much", "other"];
}

export type CaseStatus = "open" | "closed";

/** Why the day itself needs a person to look (docs/RULES.md): each of these always goes to review. */
export const BOOKING_REVIEW_REASONS = ["no_show_marked", "business_not_open", "safety_stop", "not_received", "unconfirmed"] as const;
export type BookingReviewReason = (typeof BOOKING_REVIEW_REASONS)[number];

export type ReviewCase =
  | { kind: "reference_challenge"; referenceId: string; workerId: string; ownerId: string; reason: string; status: CaseStatus }
  | { kind: "report"; category: ReportCategory; tryoutId: string; reporterId: string; businessId: string; note: string; status: CaseStatus }
  | { kind: "booking_review"; reason: BookingReviewReason; bookingId: string; businessId: string; workerId: string; status: CaseStatus }
  | { kind: "credit_request"; businessId: string; status: CaseStatus };

export const bookingReview = (reason: BookingReviewReason, booking: { bookingId: string; ownerId: string; workerId: string }): ReviewCase => ({
  kind: "booking_review",
  reason,
  bookingId: booking.bookingId,
  businessId: booking.ownerId,
  workerId: booking.workerId,
  status: "open",
});

/**
 * Harassment, unsafe work and asking a young person for money pause the
 * business at once, before anyone has looked: a young person's safety comes
 * first, and a pause can be lifted on review. Not being paid pauses it
 * through the payment rules instead (paymentFlow.ts); the rest wait for review.
 */
export const pausesBusinessAtOnce = (category: ReportCategory): boolean => category === "harassment" || category === "unsafe_work" || category === "asked_for_money";

export function newReport(input: { category: ReportCategory; tryoutId: string; reporterId: string; businessId: string; note: string }): ReviewCase {
  return { kind: "report", ...input, note: input.note.trim(), status: "open" };
}

/** Whether this business has an open harassment or unsafe-work report: the input to accountStatus (strikes.ts). */
export function hasOpenSafetyReport(cases: readonly ReviewCase[], businessId: string): boolean {
  return cases.some((item) => item.kind === "report" && item.status === "open" && item.businessId === businessId && pausesBusinessAtOnce(item.category));
}
