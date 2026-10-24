import { z } from "zod";
import { FIELD_MESSAGES, ID_PROBLEM_MESSAGES, PROFILE_MESSAGES } from "@/domain/messages";
import { AVAILABILITY, DESTINATIONS, PHOTO_KINDS } from "@/domain/profile";
import { ROLES } from "@/domain/roles";

// Every field names its own message, so a person never sees a raw validation error.

/** South African mobile numbers in any common format, stored as 27XXXXXXXXX. */
export const SaMobileSchema = z
  .string({ error: FIELD_MESSAGES.payoutPhone })
  .transform((value) => value.replace(/[\s()-]/g, "").replace(/^\+/, ""))
  .pipe(z.string().regex(/^(0|27)[6-8]\d{8}$/, FIELD_MESSAGES.payoutPhone))
  .transform((value) => (value.startsWith("0") ? `27${value.slice(1)}` : value));

/** 13 digits; spaces are allowed while typing and removed. The full number is checked, hashed and dropped. */
export const IdNumberSchema = z
  .string({ error: ID_PROBLEM_MESSAGES.format })
  .transform((value) => value.replace(/\s+/g, ""))
  .pipe(z.string().regex(/^\d{13}$/, ID_PROBLEM_MESSAGES.format));

/** What every profile route returns: never anything the person sent. */
export const SaveResultSchema = z.object({ status: z.enum(["saved", "unchanged"]), complete: z.boolean() });
export type SaveResult = z.infer<typeof SaveResultSchema>;

export const RoleSchema = z.object({ role: z.enum(ROLES, { error: PROFILE_MESSAGES.roleMissing }) });

export const PhotoSchema = z.object({ kind: z.enum(PHOTO_KINDS, { error: PROFILE_MESSAGES.fallback }) });

export const YoungPersonProfileSchema = z.object({
  firstName: z.string({ error: FIELD_MESSAGES.firstNameEmpty }).trim().min(1, FIELD_MESSAGES.firstNameEmpty).max(40, FIELD_MESSAGES.firstNameLong),
  area: z.string({ error: FIELD_MESSAGES.workerArea }).trim().min(2, FIELD_MESSAGES.workerArea).max(60, FIELD_MESSAGES.workerArea),
  availability: z.array(z.enum(AVAILABILITY), { error: FIELD_MESSAGES.availability }).min(1, FIELD_MESSAGES.availability),
  payoutPhone: SaMobileSchema,
  idNumber: IdNumberSchema,
});
export type YoungPersonProfileInput = z.infer<typeof YoungPersonProfileSchema>;

/** Step 1 of the young person form, checked in the browser before moving on. The server checks it all again. */
export const WorkerDetailsSchema = YoungPersonProfileSchema.pick({ firstName: true, area: true, availability: true, payoutPhone: true });

/** GET /api/profile: the person's own safe fields only (domain/profile.ts, profileView). */
export const ProfileViewSchema = z.object({
  role: z.enum(ROLES).nullable(),
  complete: z.boolean(),
  destination: z.enum(DESTINATIONS),
  worker: z
    .object({
      firstName: z.string().optional(),
      area: z.string().optional(),
      availability: z.array(z.enum(AVAILABILITY)).optional(),
      payoutPhone: z.string().optional(),
      idLastFour: z.string().optional(),
      hasPhoto: z.boolean(),
    })
    .nullable(),
  business: z
    .object({
      name: z.string().optional(),
      area: z.string().optional(),
      openingHours: z.string().optional(),
      location: z.object({ latitude: z.number(), longitude: z.number(), accuracyMetres: z.number() }).optional(),
      hasPhoto: z.boolean(),
    })
    .nullable(),
});
export type ProfileViewResponse = z.infer<typeof ProfileViewSchema>;

/** A pin inside South Africa's bounding box. Both coordinates or neither. */
const coordinate = (min: number, max: number) =>
  z.number({ error: FIELD_MESSAGES.pinOutsideSa }).min(min, FIELD_MESSAGES.pinOutsideSa).max(max, FIELD_MESSAGES.pinOutsideSa);

const LocationSchema = z.object(
  {
    latitude: coordinate(-35, -22),
    longitude: coordinate(16, 33),
    // Any honest reading is accepted here; whether it's precise enough is a rule (domain/profileDecisions.ts).
    accuracyMetres: z.number({ error: PROFILE_MESSAGES.fallback }).positive(PROFILE_MESSAGES.fallback).max(100_000, PROFILE_MESSAGES.fallback),
  },
  { error: FIELD_MESSAGES.pinOutsideSa },
);

export const BusinessProfileSchema = z.object({
  name: z.string({ error: FIELD_MESSAGES.businessName }).trim().min(2, FIELD_MESSAGES.businessName).max(80, FIELD_MESSAGES.businessName),
  area: z.string({ error: FIELD_MESSAGES.businessArea }).trim().min(2, FIELD_MESSAGES.businessArea).max(60, FIELD_MESSAGES.businessArea),
  openingHours: z.string({ error: FIELD_MESSAGES.openingHours }).trim().min(3, FIELD_MESSAGES.openingHours).max(120, FIELD_MESSAGES.openingHours),
  location: LocationSchema.optional(),
});
export type BusinessProfileInput = z.infer<typeof BusinessProfileSchema>;

/** Step 1 of the business form, checked in the browser before saving. */
export const BusinessDetailsSchema = BusinessProfileSchema.pick({ name: true, area: true, openingHours: true });
