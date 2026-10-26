import * as z from "zod/mini";
import { TRYOUT_FIELD_MESSAGES } from "@/domain/tryoutMessages";

// Zod's small build: the posting screen runs these in the browser (docs/DESIGN.md, Performance).
// They check shape only. The rules (hours, notice, daylight, the pay floor) are decided in
// src/domain (tryoutDecisions.ts, checkTerms), so each refusal gets its own message.

const text = (min: number, max: number, message: string) => z.string({ error: message }).check(z.trim(), z.minLength(min, message), z.maxLength(max, message));

/** The owner's one sentence. */
export const DraftRequestSchema = z.object({ description: text(10, 300, TRYOUT_FIELD_MESSAGES.description) });

/** POST /api/tryouts: the request, the reviewed draft and the terms. */
export const PostTryoutSchema = z.object({
  description: text(10, 300, TRYOUT_FIELD_MESSAGES.description),
  title: text(3, 60, TRYOUT_FIELD_MESSAGES.title),
  tasks: z.array(text(3, 120, TRYOUT_FIELD_MESSAGES.tasks), { error: TRYOUT_FIELD_MESSAGES.tasks }).check(z.minLength(1, TRYOUT_FIELD_MESSAGES.tasks), z.maxLength(6, TRYOUT_FIELD_MESSAGES.tasks)),
  // Format and range are rules: buildTryoutWindow and validateTryoutWindow refuse them with the right message.
  date: z.string().check(z.maxLength(10)),
  startTime: z.string().check(z.maxLength(5)),
  hours: z.number().check(z.gte(0), z.lte(24)),
  rateCentsPerHour: z.int({ error: TRYOUT_FIELD_MESSAGES.rate }).check(z.positive(TRYOUT_FIELD_MESSAGES.rate), z.lte(1_000_000, TRYOUT_FIELD_MESSAGES.rate)),
  supervisionConfirmed: z.literal(true, { error: TRYOUT_FIELD_MESSAGES.supervision }),
});
export type PostTryoutInput = z.infer<typeof PostTryoutSchema>;

/** A tryout id in a route's address. */
export const TryoutIdSchema = z.string().check(z.minLength(1), z.maxLength(128), z.regex(/^[A-Za-z0-9_-]+$/));

/** 2 or 3 versions to choose from (title and tasks), the suggested hours, and the date the owner named, if any. */
const DraftSchema = z.object({ options: z.array(z.object({ title: z.string(), tasks: z.array(z.string()) })), hours: z.number(), date: z.nullable(z.string()) });
/** Refused: why, a safer request to start again from, and the request's own words that show the work (display only). */
const BlockedSchema = z.object({ outcome: z.literal("blocked"), saferOption: z.string(), saferRequest: z.string(), phrase: z.nullable(z.string()) });

/** POST /api/tryouts/draft: the draft to review, or the safer option when the work can't be posted. Nothing is written. */
export const DraftResultSchema = z.discriminatedUnion("outcome", [
  z.object({ outcome: z.literal("allowed"), draft: DraftSchema }),
  z.object({ outcome: z.literal("review"), draft: DraftSchema }),
  BlockedSchema,
]);
export type DraftResult = z.infer<typeof DraftResultSchema>;

/** POST /api/tryouts: live, waiting for review, or refused with the safer option (nothing written). */
export const PostResultSchema = z.discriminatedUnion("outcome", [
  z.object({ outcome: z.literal("published"), id: z.string() }),
  z.object({ outcome: z.literal("review"), id: z.string() }),
  BlockedSchema,
]);
export type PostResult = z.infer<typeof PostResultSchema>;

export const WithdrawResultSchema = z.object({ status: z.enum(["withdrawn", "unchanged"]) });
export type WithdrawResult = z.infer<typeof WithdrawResultSchema>;

/** The owner's three one-tap answers. The reference is written from these only. */
export const OwnerAnswersSchema = z.object({
  onTime: z.boolean(),
  didTheWork: z.boolean(),
  wouldHireAgain: z.boolean(),
});
export type OwnerAnswers = z.infer<typeof OwnerAnswersSchema>;

