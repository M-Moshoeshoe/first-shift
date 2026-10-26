import { z } from "zod";
import { ALLOWED_CATEGORIES, BLOCKED_CATEGORIES } from "@/domain/allowedWork";

/** What the model must return when drafting a tryout from one sentence. */
export const TryoutDraftSchema = z.object({
  title: z.string().min(3).max(60),
  tasks: z.array(z.string().min(3).max(120)).min(1).max(6),
  hours: z.number().min(1).max(12),
  /** The model's reading of a day named in the request; code decides the date (domain/draftDate.ts). */
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .nullable()
    .optional(),
});
export type TryoutDraft = z.infer<typeof TryoutDraftSchema>;

/** The model classifies; domain/allowedWork.ts decides. */
export const WorkClassificationSchema = z.object({
  category: z.enum([...ALLOWED_CATEGORIES, ...BLOCKED_CATEGORIES]),
  confidence: z.number().min(0).max(1),
});
export type WorkClassification = z.infer<typeof WorkClassificationSchema>;

export const ReferenceTextSchema = z.object({
  text: z.string().min(20).max(400),
});
export type ReferenceText = z.infer<typeof ReferenceTextSchema>;
