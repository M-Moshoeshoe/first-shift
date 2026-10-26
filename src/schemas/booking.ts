import * as z from "zod/mini";
import { APPLICATION_STATUSES } from "@/domain/applications";
import { CHECKOUT_REASONS } from "@/domain/bookings";
import { BOOKING_STATUSES } from "@/domain/bookingStatus";
import { PAYMENT_METHODS } from "@/domain/paymentFlow";
import { REPORT_CATEGORIES } from "@/domain/cases";
import { TRYOUT_STATUSES } from "@/domain/tryout";
import { FINDING_MESSAGES } from "@/domain/findingMessages";

// Zod's small build: the owner's tryout page, Applications and the booking page read these in the browser.

const ApplicantSchema = z.object({
  workerId: z.string(),
  firstName: z.string(),
  area: z.string(),
  distance: z.nullable(z.string()),
  returnFareCents: z.nullable(z.number()),
  completedTryouts: z.number(),
  approvedReferences: z.number(),
  note: z.string(),
  skills: z.array(z.string()),
  languages: z.array(z.string()),
  intro: z.string(),
  canDoThisWork: z.boolean(),
  status: z.enum(["applied", "offered"]),
  showUp: z.object({ score: z.number(), band: z.enum(["high", "medium", "low", "new"]), reasons: z.array(z.string()) }),
  firstTimerPlace: z.boolean(),
  shortlisted: z.boolean(),
});
export type ApplicantResponse = z.infer<typeof ApplicantSchema>;

/** GET /api/tryouts/[id]/applicants: the owner's own tryout, any offer waiting, and the applicants ranked. */
export const OwnerTryoutSchema = z.object({
  tryout: z.object({ id: z.string(), title: z.string(), area: z.string(), startAt: z.string(), endAt: z.string(), payCents: z.number(), status: z.enum(TRYOUT_STATUSES) }),
  offer: z.nullable(z.object({ workerId: z.string(), firstName: z.string(), lapsesAt: z.string() })),
  bookingId: z.nullable(z.string()),
  /** No offer waiting, nobody booked, and booking still open (offers.ts). */
  canOffer: z.boolean(),
  applicants: z.array(ApplicantSchema),
});
export type OwnerTryoutResponse = z.infer<typeof OwnerTryoutSchema>;

/** GET /api/applications: the young person's applications. A lapsed offer shows as offer_ended. */
export const ApplicationsSchema = z.object({
  items: z.array(
    z.object({
      tryoutId: z.string(),
      title: z.string(),
      businessName: z.string(),
      area: z.string(),
      startAt: z.string(),
      endAt: z.string(),
      payCents: z.number(),
      status: z.enum([...APPLICATION_STATUSES, "offer_ended"]),
      bookingId: z.nullable(z.string()),
    }),
  ),
  /** "Job offer from {business}": offers made after tryouts together (domain/hire.ts). */
  jobOffers: z.array(z.object({ businessName: z.string(), at: z.string() })),
});
export type ApplicationsResponse = z.infer<typeof ApplicationsSchema>;

export const BadgesSchema = z.object({ count: z.number() });
export type BadgesResponse = z.infer<typeof BadgesSchema>;

export const OfferResultSchema = z.object({ status: z.enum(["offered", "unchanged"]) });
export const SeenResultSchema = z.object({ status: z.literal("seen") });
export const AnswerResultSchema = z.object({ status: z.enum(["booked", "declined", "unchanged"]) });
export const OfferSchema = z.object({ workerId: z.string().check(z.minLength(1), z.maxLength(128), z.regex(/^[A-Za-z0-9_-]+$/)) });
export const AnswerSchema = z.object({ answer: z.enum(["accept", "decline"]) });
export const ReportSchema = z.object({
  category: z.enum(REPORT_CATEGORIES, { error: "Choose what happened." }),
  note: z.optional(z.string({ error: FINDING_MESSAGES.reportNote }).check(z.trim(), z.maxLength(1000, FINDING_MESSAGES.reportNote))),
});

/** GET /api/bookings/[id]: what this party may see. The owner gets the payout number; the young person the check-in code. */
export const BookingViewSchema = z.object({
  id: z.string(),
  tryoutId: z.string(),
  party: z.enum(["business", "young_person"]),
  title: z.string(),
  businessName: z.string(),
  businessArea: z.string(),
  workerFirstName: z.string(),
  startAt: z.string(),
  endAt: z.string(),
  hours: z.number(),
  rateCentsPerHour: z.number(),
  payCents: z.number(),
  status: z.enum(BOOKING_STATUSES),
  mapsUrl: z.string(),
  pinAccuracyMetres: z.number(),
  photo: z.object({ subject: z.string(), kind: z.enum(["profile", "shopfront"]) }),
  payoutPhone: z.nullable(z.string()),
  /** The young person's view only, once booked: the owner's first name and face (docs/RULES.md, Accountability). */
  owner: z.nullable(z.object({ firstName: z.string(), subject: z.string() })),
  /** WhatsApp with the other side: the owner gets the young person's number, the young person the owner's. */
  whatsappUrl: z.nullable(z.string()),
  checkInCode: z.nullable(z.string()),
  shareToken: z.nullable(z.string()),
  cancel: z.nullable(z.object({ kind: z.enum(["free", "late"]), owedCents: z.number() })),
  day: z.object({
    canCheckIn: z.boolean(),
    canNoShow: z.boolean(),
    canReportNotOpen: z.boolean(),
    canCheckOut: z.boolean(),
    payable: z.boolean(),
    canSkipToDay: z.boolean(),
    checkedInAt: z.nullable(z.string()),
    endReason: z.nullable(z.enum(CHECKOUT_REASONS)),
    owedCents: z.number(),
    owedMinimumCents: z.number(),
    payment: z.nullable(
      z.object({ state: z.enum(["awaiting_payment", "awaiting_confirmation", "received", "not_received"]), method: z.nullable(z.enum(PAYMENT_METHODS)), amountCents: z.nullable(z.number()), reference: z.nullable(z.string()) }),
    ),
    /** The ways the owner may pay: the ones the young person chose (day.ts, methodsFor). */
    payMethods: z.array(z.enum(PAYMENT_METHODS)),
    door: z.nullable(z.object({ lastFour: z.string() })),
    remind: z.boolean(),
    /** Proof, only after Not received: whether this side may still add theirs (evidence.ts). */
    evidence: z.object({ canAdd: z.boolean(), sent: z.boolean() }),
  }),
});

export const DoorCheckSchema = z.object({
  code: z.string({ error: "Type their six-digit check-in code." }).check(z.trim(), z.regex(/^\d{3} ?\d{3}$/, "Type their six-digit check-in code.")),
  faceMatches: z.boolean(),
  nameMatches: z.boolean(),
  lastFourMatches: z.boolean(),
});
// Each of the owner's three answers is required: a reference is written from them (domain/references.ts).
const answer = (message: string) => z.boolean({ error: message });
export const CheckOutSchema = z.object({
  reason: z.enum(CHECKOUT_REASONS, { error: "Choose how the day ended." }),
  answers: z.object(
    { onTime: answer("Say whether they were on time."), didTheWork: answer("Say whether they did the work as asked."), wouldHireAgain: answer("Say whether you would hire them again.") },
    { error: "Answer the three questions about the day." },
  ),
});
export const ConfirmSchema = z.object({ received: z.boolean() });
export const StepResultSchema = z.object({ status: z.enum(["done", "unchanged"]) });
export type BookingViewResponse = z.infer<typeof BookingViewSchema>;

export const CancelResultSchema = z.object({ status: z.enum(["cancelled", "unchanged"]) });

/** POST /api/bookings/[id]/skip-to-day, demo only. */
export const SkipResultSchema = z.object({ status: z.enum(["skipped", "unchanged"]) });
export const ReportResultSchema = z.object({ paused: z.boolean() });
