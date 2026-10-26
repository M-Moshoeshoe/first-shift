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
});
export type SharedRecordResponse = z.infer<typeof SharedRecordSchema>;
