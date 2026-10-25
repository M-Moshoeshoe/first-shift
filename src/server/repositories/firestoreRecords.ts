import "server-only";
import { Timestamp } from "firebase-admin/firestore";
import { z } from "zod";
import { APPLICATION_STATUSES, type ApplicationRecord } from "@/domain/applications";
import type { BookingRecord } from "@/domain/bookings";
import { BOOKING_STATUSES } from "@/domain/bookingStatus";
import type { BookingSecrets } from "./offerRepository";

/*
 * Stored applications and bookings, parsed on the way in, so a malformed
 * record fails loudly instead of being trusted. Shared by the repositories
 * that read them.
 */
export const instant = z.instanceof(Timestamp).transform((value) => value.toDate());

const ApplicationSchema = z.object({
  tryoutId: z.string(),
  workerId: z.string(),
  ownerId: z.string(),
  note: z.string(),
  status: z.enum(APPLICATION_STATUSES),
  demo: z.boolean(),
  startAt: instant,
  endAt: instant,
  seenByOwner: z.boolean().optional(),
});

const BookingSchema = z.object({
  tryoutId: z.string(),
  ownerId: z.string(),
  workerId: z.string(),
  demo: z.boolean(),
  title: z.string(),
  businessName: z.string(),
  businessArea: z.string(),
  location: z.object({ latitude: z.number(), longitude: z.number(), accuracyMetres: z.number() }),
  workerFirstName: z.string(),
  workerArea: z.string(),
  workerPayoutPhone: z.string(),
  startAt: instant,
  endAt: instant,
  hours: z.number(),
  rateCentsPerHour: z.number().int(),
  payCents: z.number().int(),
  status: z.enum(BOOKING_STATUSES),
  bookedAt: instant,
  cancellation: z
    .object({ by: z.enum(["business", "young_person"]), byUid: z.string(), at: instant, kind: z.enum(["free", "late"]), reliedOnGrace: z.boolean() })
    .nullable()
    .optional(),
  owedCents: z.number().int().nullable().optional(),
});

const SecretsSchema = z.object({ checkInCode: z.string(), shareToken: z.string(), expiresAt: instant });

export const parseApplication = (data: unknown): ApplicationRecord => ApplicationSchema.parse(data);
// The day's fields (check-in, check-out, payment) are added in Phase 5 and pass through untouched here.
export const parseBooking = (data: unknown): BookingRecord => BookingSchema.parse(data);
export const parseSecrets = (data: unknown): BookingSecrets => SecretsSchema.parse(data);

/** Firestore rejects undefined values; optional fields that aren't set are simply left out. */
export const defined = (record: object): Record<string, unknown> => Object.fromEntries(Object.entries(record).filter(([, value]) => value !== undefined));
