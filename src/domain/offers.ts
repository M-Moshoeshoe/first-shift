import { RULES } from "@/config/rules";
import { bookingOpen, type ApplicationRecord } from "./applications";
import { decideHold, type CreditEntry } from "./credits";
import { isExampleApplicant, type Viewer } from "./demo";
import { crossesRegularEmploymentLine, type WorkedSlot } from "./regularEmployment";
import type { TryoutWindow } from "./schedule";
import { addMinutes } from "./time";
import type { TryoutRecord } from "./tryoutDecisions";

/**
 * The owner offers the tryout to one applicant at a time; the young person
 * accepts or declines. An offer lapses at the booking cut-off (an hour before
 * the start), worked out from the clock whenever anyone looks, so nothing
 * has to run in the background.
 */
export const offerLapsesAt = (tryout: Pick<TryoutRecord, "startAt">): Date => addMinutes(tryout.startAt, -RULES.bookingCutoffMinutes);

/** The offer still waiting for an answer, or null if there's none or it has lapsed. */
export function openOffer(tryout: TryoutRecord, now: Date): { workerId: string; at: Date } | null {
  return tryout.offer && bookingOpen(tryout, now) ? tryout.offer : null;
}

export type OfferProblem = "not_found" | "not_open" | "offer_pending" | "not_applicant" | "example_applicant";

/** The owner makes an offer: their own published tryout, open for booking, no offer waiting, to someone who has applied. */
export function decideOffer(owner: Viewer, tryout: TryoutRecord | null, application: ApplicationRecord | null, now: Date): { kind: "offer" } | { kind: "unchanged" } | { kind: "refuse"; problem: OfferProblem } {
  if (!tryout || tryout.ownerId !== owner.uid) return { kind: "refuse", problem: "not_found" };
  if (!bookingOpen(tryout, now)) return { kind: "refuse", problem: "not_open" };
  const pending = openOffer(tryout, now);
  if (pending && application && pending.workerId === application.workerId) return { kind: "unchanged" };
  if (pending) return { kind: "refuse", problem: "offer_pending" };
  if (!application || application.status !== "applied") return { kind: "refuse", problem: "not_applicant" };
  // A made-up demo applicant has no account to answer with.
  if (isExampleApplicant(application.workerId)) return { kind: "refuse", problem: "example_applicant" };
  return { kind: "offer" };
}

export type AcceptProblem = "no_offer" | "lapsed" | "no_credits" | "overlaps_booking" | "regular_employment";

export interface AcceptInputs {
  tryout: TryoutRecord | null;
  application: ApplicationRecord | null;
  /** The business's credit ledger: accepting holds one credit. */
  ownerLedger: readonly CreditEntry[];
  /** The young person's own booked tryouts, with any business. */
  workerBookings: readonly TryoutWindow[];
  /** Booked or completed tryouts between this business and this young person, for the 24-hour line. */
  pairSlots: readonly WorkedSlot[];
  now: Date;
}

export type AnswerDecision =
  | { kind: "accept"; hold: CreditEntry[] }
  | { kind: "decline" }
  | { kind: "unchanged" }
  | { kind: "refuse"; problem: AcceptProblem | "not_found" };

/**
 * The young person answers an offer made to them. Accepting is checked on the
 * server against everything that could have changed since the offer: booking
 * still open, a credit the business can hold, no overlap with another
 * booking, and the 24-hour line with this business (regularEmployment.ts).
 */
export function decideAnswer(viewer: Viewer, inputs: AcceptInputs, answer: "accept" | "decline"): AnswerDecision {
  const { tryout, application, now } = inputs;
  if (!tryout || !application || application.workerId !== viewer.uid) return { kind: "refuse", problem: "not_found" };
  if (answer === "accept" && application.status === "booked") return { kind: "unchanged" };
  if (answer === "decline" && application.status === "declined") return { kind: "unchanged" };
  if (application.status !== "offered" || tryout.offer?.workerId !== viewer.uid) return { kind: "refuse", problem: "no_offer" };
  if (!openOffer(tryout, now)) return { kind: "refuse", problem: "lapsed" };
  if (answer === "decline") return { kind: "decline" };

  const window = { start: tryout.startAt, end: tryout.endAt };
  if (inputs.workerBookings.some((booked) => booked.start < window.end && window.start < booked.end)) return { kind: "refuse", problem: "overlaps_booking" };
  if (crossesRegularEmploymentLine(inputs.pairSlots, { startAt: tryout.startAt, hours: tryout.hours })) return { kind: "refuse", problem: "regular_employment" };
  const hold = decideHold(inputs.ownerLedger, application.tryoutId);
  if (hold.kind === "refuse") return { kind: "refuse", problem: "no_credits" };
  return { kind: "accept", hold: hold.kind === "append" ? hold.entries : [] };
}

/** The young person's other open applications that overlap the tryout they've just been booked on: these are withdrawn. */
export function overlappingApplications(applications: readonly ApplicationRecord[], booked: TryoutWindow, bookedTryoutId: string): ApplicationRecord[] {
  return applications.filter(
    (application) => application.tryoutId !== bookedTryoutId && (application.status === "applied" || application.status === "offered") && application.startAt < booked.end && booked.start < application.endAt,
  );
}
