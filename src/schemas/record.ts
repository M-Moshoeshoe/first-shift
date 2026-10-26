import * as z from "zod/mini";
import { RULES } from "@/config/rules";
import { HIRE_ANSWERS, HIRE_KINDS, HIRE_OUTCOMES } from "@/domain/hire";
import { HIRE_COPY, REFERENCE_COPY } from "@/domain/recordCopy";
import { REFERENCE_STATUSES } from "@/domain/references";

// Zod's small build: the reference panel, the record and the shared record read these in the browser.

const AnswersSchema = z.object({ onTime: z.boolean(), didTheWork: z.boolean(), wouldHireAgain: z.boolean() });

/** GET /api/bookings/[id]/reference: the young person's reference to review, or the owner's answers, read-only. */
export const ReferenceViewSchema = z.object({
  party: z.enum(["business", "young_person"]),
  answers: z.nullable(AnswersSchema),
  reference: z.nullable(z.object({ status: z.enum(REFERENCE_STATUSES), text: z.string(), answers: AnswersSchema, challengeRejected: z.boolean() })),
  /** A challenge upheld on review took it off. */
  withdrawn: z.optional(z.boolean()),
  canWrite: z.boolean(),
});
export type ReferenceViewResponse = z.infer<typeof ReferenceViewSchema>;

/** POST /api/references/[id]. */
export const ReferenceDecisionSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("approve") }),
  z.object({ action: z.literal("challenge"), reason: z.string({ error: REFERENCE_COPY.challengeNeeded }).check(z.trim(), z.minLength(3, REFERENCE_COPY.challengeNeeded), z.maxLength(500, REFERENCE_COPY.challengeNeeded)) }),
]);
export const DraftResultSchema = z.object({ status: z.enum(["written", "unchanged"]) });

const EntrySchema = z.object({
  businessName: z.string(),
  businessArea: z.string(),
  title: z.string(),
  day: z.string(),
  hours: z.number(),
});

/** GET /api/record: the young person's own record and its share token. */
export const RecordViewSchema = z.object({
  firstName: z.string(),
  shareToken: z.string(),
  entries: z.array(z.extend(EntrySchema, { bookingId: z.string(), reference: z.nullable(z.object({ text: z.string(), answers: AnswersSchema, status: z.enum(REFERENCE_STATUSES) })) })),
  jobs: z.array(z.object({ businessName: z.string(), hired: z.boolean() })),
});
export type RecordViewResponse = z.infer<typeof RecordViewSchema>;

const JobDetailsSchema = z.object({ role: z.string(), daysPerWeek: z.number(), rateCentsPerHour: z.number() });

/**
 * GET and POST /api/bookings/[id]/hire: whether "Offer {name} a job" is due,
 * and once made, the offer, the young person's answer, the owner's outcome
 * and the WhatsApp message to send.
 */
export const HireViewSchema = z.object({
  due: z.boolean(),
  offer: z.nullable(
    z.object({
      kind: z.enum(HIRE_KINDS),
      details: z.nullable(JobDetailsSchema),
      answer: z.nullable(z.enum(HIRE_ANSWERS)),
      outcome: z.nullable(z.enum(HIRE_OUTCOMES)),
    }),
  ),
  whatsappUrl: z.nullable(z.string()),
});

/** POST /api/bookings/[id]/hire: an invitation to talk, or an offer with its details. The server checks the pay against the minimum wage. */
export const JobOfferInputSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("talk"), message: z.string().check(z.maxLength(RULES.jobMessageMaxChars, HIRE_COPY.problems.message)) }),
  z.object({
    kind: z.literal("offer"),
    message: z.string().check(z.maxLength(RULES.jobMessageMaxChars, HIRE_COPY.problems.message)),
    role: z.string().check(z.trim(), z.minLength(2, HIRE_COPY.problems.role), z.maxLength(RULES.jobRoleMaxChars, HIRE_COPY.problems.role)),
    daysPerWeek: z.number().check(z.int(), z.gte(1, HIRE_COPY.problems.days), z.lte(RULES.jobDaysPerWeekMax, HIRE_COPY.problems.days)),
    rateCentsPerHour: z.number().check(z.int(), z.gte(RULES.minimumWageCentsPerHour, HIRE_COPY.problems.below_minimum_wage)),
  }),
]);

/** POST /api/bookings/[id]/hire/outcome: what the owner marks later. */
export const HireOutcomeInputSchema = z.object({ outcome: z.enum(HIRE_OUTCOMES) });

/** POST /api/job-offers/[id]/answer: the young person's answer. */
export const HireAnswerInputSchema = z.object({ answer: z.enum(HIRE_ANSWERS) });
/** The answer recorded, and for "I'm interested", the WhatsApp message to the owner. */
export const HireAnswerResultSchema = z.object({ status: z.enum(["answered", "unchanged"]), whatsappUrl: z.nullable(z.string()) });
export type HireViewResponse = z.infer<typeof HireViewSchema>;
