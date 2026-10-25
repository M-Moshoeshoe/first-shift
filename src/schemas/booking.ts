import * as z from "zod/mini";
import { APPLICATION_STATUSES } from "@/domain/applications";
import { BOOKING_STATUSES } from "@/domain/bookingStatus";
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
  whatsappUrl: z.nullable(z.string()),
  checkInCode: z.nullable(z.string()),
  shareToken: z.nullable(z.string()),
  cancel: z.nullable(z.object({ kind: z.enum(["free", "late"]), owedCents: z.number() })),
});
export type BookingViewResponse = z.infer<typeof BookingViewSchema>;

export const CancelResultSchema = z.object({ status: z.enum(["cancelled", "unchanged"]) });
export const ReportResultSchema = z.object({ paused: z.boolean() });
