import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import type { z } from "zod";
import { AI_MODEL } from "@/config/ai";
import { serverEnv } from "./env";
import { AppError } from "./errors";
import { log } from "./log";

let client: Anthropic | undefined;

function anthropic(): Anthropic {
  const apiKey = serverEnv().ANTHROPIC_API_KEY;
  if (!apiKey) throw new AppError(503, "not_configured", "AI isn't set up yet. Add ANTHROPIC_API_KEY (see README).");
  client ??= new Anthropic({ apiKey, timeout: 20_000, maxRetries: 1 });
  return client;
}

function extractJson(text: string): unknown {
  const cleaned = text.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/, "").trim();
  return JSON.parse(cleaned);
}

interface JsonRequest<T> {
  purpose: string;
  system: string;
  user: string;
  maxTokens: number;
  schema: z.ZodType<T>;
}

/**
 * Asks the model for JSON and validates it. Anything that doesn't match the
 * schema is rejected, so the app fails closed instead of trusting bad output.
 */
export async function askForJson<T>({ purpose, system, user, maxTokens, schema }: JsonRequest<T>): Promise<T> {
  try {
    const message = await anthropic().messages.create({
      model: AI_MODEL,
      max_tokens: maxTokens,
      system,
      messages: [{ role: "user", content: user }],
    });
    const text = message.content.flatMap((block) => (block.type === "text" ? [block.text] : [])).join("");
    const parsed = schema.safeParse(extractJson(text));
    if (!parsed.success) throw new Error("schema_mismatch");
    return parsed.data;
  } catch (error) {
    if (error instanceof AppError) throw error;
    log("error", "ai_request_failed", { purpose, reason: error instanceof Error ? error.message : "unknown" });
    throw new AppError(502, "ai_unavailable", "We couldn't do that right now. Try again, or fill it in yourself.");
  }
}
