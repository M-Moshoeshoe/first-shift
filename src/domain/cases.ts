/**
 * Review cases: everything a person on the team must look at. Two kinds so
 * far: a young person challenging a reference (references.ts), and a report
 * about a tryout from either side. Opening a case never decides it; a person
 * does, on review.
 */
export const REPORT_CATEGORIES = ["harassment", "unsafe_work", "not_paid", "other"] as const;
export type ReportCategory = (typeof REPORT_CATEGORIES)[number];

export type CaseStatus = "open" | "closed";

/** Why the day itself needs a person to look (docs/RULES.md): each of these always goes to review. */
export const BOOKING_REVIEW_REASONS = ["no_show_marked", "business_not_open", "safety_stop", "not_received", "unconfirmed"] as const;
export type BookingReviewReason = (typeof BOOKING_REVIEW_REASONS)[number];

export type ReviewCase =
  | { kind: "reference_challenge"; referenceId: string; workerId: string; ownerId: string; reason: string; status: CaseStatus }
  | { kind: "report"; category: ReportCategory; tryoutId: string; reporterId: string; businessId: string; note: string; status: CaseStatus }
  | { kind: "booking_review"; reason: BookingReviewReason; bookingId: string; businessId: string; workerId: string; status: CaseStatus };

export const bookingReview = (reason: BookingReviewReason, booking: { bookingId: string; ownerId: string; workerId: string }): ReviewCase => ({
  kind: "booking_review",
  reason,
  bookingId: booking.bookingId,
  businessId: booking.ownerId,
  workerId: booking.workerId,
  status: "open",
});

/**
 * Harassment and unsafe work pause the business at once, before anyone has
 * looked: a young person's safety comes first, and a pause can be lifted on
 * review. Not being paid pauses it through the payment rules instead
 * (paymentFlow.ts), and "other" waits for review.
 */
export const pausesBusinessAtOnce = (category: ReportCategory): boolean => category === "harassment" || category === "unsafe_work";

export function newReport(input: { category: ReportCategory; tryoutId: string; reporterId: string; businessId: string; note: string }): ReviewCase {
  return { kind: "report", ...input, note: input.note.trim(), status: "open" };
}

/** Whether this business has an open harassment or unsafe-work report: the input to accountStatus (strikes.ts). */
export function hasOpenSafetyReport(cases: readonly ReviewCase[], businessId: string): boolean {
  return cases.some((item) => item.kind === "report" && item.status === "open" && item.businessId === businessId && pausesBusinessAtOnce(item.category));
}
