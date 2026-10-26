import * as z from "zod/mini";
import { FIELD_MESSAGES, ID_PROBLEM_MESSAGES, PROFILE_MESSAGES } from "@/domain/messages";
import { AVAILABILITY, DESTINATIONS, PHOTO_KINDS } from "@/domain/profile";
import { COIDA_ANSWERS } from "@/domain/injuryCover";
import { PAYMENT_METHODS } from "@/domain/paymentFlow";
import { RULES } from "@/config/rules";
import { LANGUAGES, SKILLS } from "@/domain/workerProfile";
import { ROLES } from "@/domain/roles";

// Zod's small build (zod/mini): these schemas run in the browser as well as on
// the server, and the full build cost about 20 KB on every account page
// (docs/DESIGN.md, Performance). Same rules, functional style.
// Every field names its own message, so a person never sees a raw validation error.

/** South African mobile numbers in any common format, stored as 27XXXXXXXXX. */
export const SaMobileSchema = z.pipe(
  z.pipe(
    z.string({ error: FIELD_MESSAGES.payoutPhone }),
    z.transform((value: string) => value.replace(/[\s()-]/g, "").replace(/^\+/, "")),
  ),
  z.pipe(
    z.string().check(z.regex(/^(0|27)[6-8]\d{8}$/, FIELD_MESSAGES.payoutPhone)),
    z.transform((value: string) => (value.startsWith("0") ? `27${value.slice(1)}` : value)),
  ),
);

/** 13 digits; spaces are allowed while typing and removed. The full number is checked, hashed and dropped. */
export const IdNumberSchema = z.pipe(
  z.pipe(z.string({ error: ID_PROBLEM_MESSAGES.format }), z.transform((value: string) => value.replace(/\s+/g, ""))),
  z.string().check(z.regex(/^\d{13}$/, ID_PROBLEM_MESSAGES.format)),
);

/** What every profile route returns: never anything the person sent. */
export const SaveResultSchema = z.object({ status: z.enum(["saved", "unchanged"]), complete: z.boolean() });
export type SaveResult = z.infer<typeof SaveResultSchema>;

export const RoleSchema = z.object({ role: z.enum(ROLES, { error: PROFILE_MESSAGES.roleMissing }) });

export const PhotoSchema = z.object({ kind: z.enum(PHOTO_KINDS, { error: PROFILE_MESSAGES.fallback }) });

/** A trimmed string between min and max characters, with one message for every way it can be wrong. */
const text = (min: number, max: number, message: string, tooLong = message) =>
  z.string({ error: message }).check(z.trim(), z.minLength(min, message), z.maxLength(max, tooLong));

const PayMethodsSchema = z.array(z.enum(PAYMENT_METHODS, { error: FIELD_MESSAGES.payMethods }), { error: FIELD_MESSAGES.payMethods }).check(z.minLength(1, FIELD_MESSAGES.payMethods));
const SkillsSchema = z.array(z.enum(SKILLS, { error: FIELD_MESSAGES.skills }), { error: FIELD_MESSAGES.skills }).check(z.minLength(1, FIELD_MESSAGES.skills), z.maxLength(RULES.skillsMax, FIELD_MESSAGES.skills));
const LanguagesSchema = z.array(z.enum(LANGUAGES, { error: FIELD_MESSAGES.languages }), { error: FIELD_MESSAGES.languages }).check(z.minLength(1, FIELD_MESSAGES.languages));
// The server takes out contact details (workerProfile.ts, cleanIntro); this only bounds the length.
const IntroSchema = z.string({ error: FIELD_MESSAGES.introLong }).check(z.trim(), z.maxLength(RULES.introMaxChars, FIELD_MESSAGES.introLong));
const SurnameSchema = text(1, 60, FIELD_MESSAGES.surname);

export const YoungPersonProfileSchema = z.object({
  firstName: text(1, 40, FIELD_MESSAGES.firstNameEmpty, FIELD_MESSAGES.firstNameLong),
  area: text(2, 60, FIELD_MESSAGES.workerArea),
  availability: z.array(z.enum(AVAILABILITY), { error: FIELD_MESSAGES.availability }).check(z.minLength(1, FIELD_MESSAGES.availability)),
  payoutPhone: SaMobileSchema,
  payMethods: PayMethodsSchema,
  skills: SkillsSchema,
  languages: LanguagesSchema,
  intro: IntroSchema,
  legalSurname: SurnameSchema,
  idNumber: IdNumberSchema,
});
export type YoungPersonProfileInput = z.infer<typeof YoungPersonProfileSchema>;

/** Step 1 of the young person form, checked in the browser before moving on. The server checks it all again. */
export const WorkerDetailsSchema = z.pick(YoungPersonProfileSchema, { firstName: true, area: true, availability: true, payoutPhone: true, payMethods: true });

/** Step 2 of the young person form: what they can do, their languages and the introduction. */
export const WorkerAboutSchema = z.pick(YoungPersonProfileSchema, { skills: true, languages: true, intro: true });

/** POST /api/profile/worker/edit: what a young person can change after onboarding. The surname is sent only if it was never set. */
export const WorkerEditSchema = z.extend(z.pick(YoungPersonProfileSchema, { payMethods: true, skills: true, languages: true, intro: true }), {
  legalSurname: z.optional(SurnameSchema),
});
export type WorkerEditInput = z.infer<typeof WorkerEditSchema>;

/** POST /api/profile/owner: the business owner's own details. The ID number is checked, hashed and dropped. */
export const OwnerSchema = z.object({
  legalName: z.string({ error: FIELD_MESSAGES.legalName }).check(z.trim(), z.minLength(3, FIELD_MESSAGES.legalName), z.maxLength(100, FIELD_MESSAGES.legalName), z.regex(/\S\s+\S/, FIELD_MESSAGES.legalName)),
  idNumber: IdNumberSchema,
  phone: SaMobileSchema,
  cipc: z.optional(z.string({ error: FIELD_MESSAGES.cipc }).check(z.trim(), z.regex(/^(\d{4}\/\d{6}\/\d{2})?$/, FIELD_MESSAGES.cipc))),
});
export type OwnerInput = z.infer<typeof OwnerSchema>;
/** The owner form, checked in the browser before sending. */
export const OwnerDetailsSchema = z.pick(OwnerSchema, { legalName: true, phone: true, cipc: true });

/** GET /api/profile: the person's own safe fields only (domain/profile.ts, profileView). */
export const ProfileViewSchema = z.object({
  role: z.nullable(z.enum(ROLES)),
  complete: z.boolean(),
  destination: z.enum(DESTINATIONS),
  worker: z.nullable(
    z.object({
      firstName: z.optional(z.string()),
      area: z.optional(z.string()),
      availability: z.optional(z.array(z.enum(AVAILABILITY))),
      payoutPhone: z.optional(z.string()),
      payMethods: z.optional(z.array(z.enum(PAYMENT_METHODS))),
      skills: z.optional(z.array(z.enum(SKILLS))),
      languages: z.optional(z.array(z.enum(LANGUAGES))),
      intro: z.optional(z.string()),
      idLastFour: z.optional(z.string()),
      hasPhoto: z.boolean(),
      hasSurname: z.boolean(),
    }),
  ),
  business: z.nullable(
    z.object({
      name: z.optional(z.string()),
      area: z.optional(z.string()),
      openingHours: z.optional(z.string()),
      location: z.optional(z.object({ latitude: z.number(), longitude: z.number(), accuracyMetres: z.number() })),
      coida: z.optional(z.enum(COIDA_ANSWERS)),
      hasPhoto: z.boolean(),
      credits: z.object({ available: z.number(), onlyFree: z.boolean() }),
      pause: z.nullable(z.object({ reason: z.enum(["unpaid", "report", "other"]), bookingId: z.nullable(z.string()) })),
      owner: z.object({
        legalName: z.optional(z.string()),
        idLastFour: z.optional(z.string()),
        phone: z.optional(z.string()),
        cipc: z.optional(z.string()),
        hasPhoto: z.boolean(),
        ready: z.boolean(),
      }),
    }),
  ),
});
export type ProfileViewResponse = z.infer<typeof ProfileViewSchema>;

/** A pin inside South Africa's bounding box. Both coordinates or neither. */
const coordinate = (min: number, max: number) =>
  z.number({ error: FIELD_MESSAGES.pinOutsideSa }).check(z.gte(min, FIELD_MESSAGES.pinOutsideSa), z.lte(max, FIELD_MESSAGES.pinOutsideSa));

const LocationSchema = z.object(
  {
    latitude: coordinate(-35, -22),
    longitude: coordinate(16, 33),
    // Any honest reading is accepted here; whether it's precise enough is a rule (domain/profileDecisions.ts).
    accuracyMetres: z.number({ error: PROFILE_MESSAGES.fallback }).check(z.positive(PROFILE_MESSAGES.fallback), z.lte(100_000, PROFILE_MESSAGES.fallback)),
  },
  { error: FIELD_MESSAGES.pinOutsideSa },
);

export const BusinessProfileSchema = z.object({
  name: text(2, 80, FIELD_MESSAGES.businessName),
  area: text(2, 60, FIELD_MESSAGES.businessArea),
  openingHours: text(3, 120, FIELD_MESSAGES.openingHours),
  location: z.optional(LocationSchema),
  // Optional on the wire, so a save from the pin step keeps the answer already given (decideBusinessSave).
  coida: z.optional(z.enum(COIDA_ANSWERS, { error: FIELD_MESSAGES.coida })),
});
export type BusinessProfileInput = z.infer<typeof BusinessProfileSchema>;

/** Step 1 of the business form, checked in the browser before saving. */
export const BusinessDetailsSchema = z.extend(z.pick(BusinessProfileSchema, { name: true, area: true, openingHours: true }), {
  coida: z.enum(COIDA_ANSWERS, { error: FIELD_MESSAGES.coida }),
});
