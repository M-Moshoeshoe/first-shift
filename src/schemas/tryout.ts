import { z } from "zod";

export const PostTryoutSchema = z.object({
  description: z.string().trim().min(10).max(300),
  start: z.iso.datetime({ offset: true }),
  end: z.iso.datetime({ offset: true }),
  rateCentsPerHour: z.number().int().positive(),
  supervisionConfirmed: z.literal(true),
});
export type PostTryoutInput = z.infer<typeof PostTryoutSchema>;

export const ApplySchema = z.object({
  tryoutId: z.string().min(1).max(128),
  note: z.string().trim().max(200).optional(),
});

/** The owner's three one-tap answers. The reference is written from these only. */
export const OwnerAnswersSchema = z.object({
  onTime: z.boolean(),
  didTheWork: z.boolean(),
  wouldHireAgain: z.boolean(),
});
export type OwnerAnswers = z.infer<typeof OwnerAnswersSchema>;

export const MarkPaidSchema = z.object({
  bookingId: z.string().min(1).max(128),
  method: z.enum(["ewallet", "bank_transfer", "cash"]),
  amountCents: z.number().int().positive(),
});
