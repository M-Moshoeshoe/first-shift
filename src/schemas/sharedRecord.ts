import * as z from "zod/mini";

// Its own module, with no copy in it: the public record page loads only this (docs/DESIGN.md, Performance).

const AnswersSchema = z.object({ onTime: z.boolean(), didTheWork: z.boolean(), wouldHireAgain: z.boolean() });

/** GET /api/record/[token]: the first name and the verified entries, with approved references only. */
export const SharedRecordSchema = z.object({
  firstName: z.string(),
  entries: z.array(
    z.object({
      businessName: z.string(),
      businessArea: z.string(),
      title: z.string(),
      day: z.string(),
      hours: z.number(),
      reference: z.nullable(z.object({ text: z.string(), answers: AnswersSchema })),
    }),
  ),
  /** "Offered a job by {business}", and "Hired by {business}" once the owner marks it (domain/hire.ts). */
  jobs: z.array(z.object({ businessName: z.string(), hired: z.boolean() })),
});
export type SharedRecordResponse = z.infer<typeof SharedRecordSchema>;
