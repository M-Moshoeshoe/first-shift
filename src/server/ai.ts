import "server-only";
import { AI_LIMITS } from "@/config/ai";
import { decideWork, quotedPhrase, type WorkDecision } from "@/domain/allowedWork";
import { ReferenceTextSchema, TryoutDraftSchema, WorkClassificationSchema, type TryoutDraft } from "@/schemas/ai";
import type { OwnerAnswers } from "@/schemas/tryout";
import { todayForPrompt } from "@/domain/draftDate";
import { askForJson } from "./claude";
import { classifyWorkPrompt, draftTryoutPrompt, writeReferencePrompt } from "./prompts";

export async function draftTryout(description: string, now: Date = new Date()): Promise<TryoutDraft> {
  return askForJson({ purpose: "draft", ...draftTryoutPrompt(description, todayForPrompt(now)), maxTokens: AI_LIMITS.draftMaxTokens, schema: TryoutDraftSchema });
}

/** The model classifies; the domain rule decides. */
export async function checkWork(description: string): Promise<WorkDecision> {
  const classification = await askForJson({
    purpose: "classify",
    ...classifyWorkPrompt(description),
    maxTokens: AI_LIMITS.classifyMaxTokens,
    schema: WorkClassificationSchema,
  });
  return decideWork(classification.category, classification.confidence, quotedPhrase(description, classification.phrase));
}

export async function writeReference(answers: OwnerAnswers, tasks: string[]): Promise<string> {
  const result = await askForJson({
    purpose: "reference",
    ...writeReferencePrompt(answers, tasks),
    maxTokens: AI_LIMITS.referenceMaxTokens,
    schema: ReferenceTextSchema,
  });
  return result.text;
}
