import * as z from "zod/mini";
import { REFERENCE_COPY } from "@/domain/recordCopy";
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
});
export type RecordViewResponse = z.infer<typeof RecordViewSchema>;

/** GET and POST /api/bookings/[id]/hire: whether "Offer {name} a job" is due, and once offered, the WhatsApp message to send. */
export const HireViewSchema = z.object({ due: z.boolean(), offered: z.boolean(), whatsappUrl: z.nullable(z.string()) });
export type HireViewResponse = z.infer<typeof HireViewSchema>;
