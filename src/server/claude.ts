import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import type { z } from "zod";
import { AI_EFFORT, AI_MODEL } from "@/config/ai";
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

interface JsonRequest<T> {
  purpose: string;
  system: string;
  user: string;
  maxTokens: number;
  schema: z.ZodType<T>;
}

/**
 * Asks the model for JSON in the schema's shape (structured outputs) and
 * validates it with the full Zod schema. A refusal, a cut-off answer or
 * anything that doesn't match is rejected, so the app fails closed instead of
 * trusting bad output.
 */
export async function askForJson<T>({ purpose, system, user, maxTokens, schema }: JsonRequest<T>): Promise<T> {
  try {
    const message = await anthropic().messages.parse({
      model: AI_MODEL,
      max_tokens: maxTokens,
      output_config: { effort: AI_EFFORT, format: zodOutputFormat(schema) },
      system,
      messages: [{ role: "user", content: user }],
    });
    // Only a finished answer counts: "refusal" and "max_tokens" mean there is no complete JSON to trust.
    if (message.stop_reason !== "end_turn") throw new Error(`stopped_${message.stop_reason ?? "unknown"}`);
    if (message.parsed_output === null) throw new Error("schema_mismatch");
    return message.parsed_output;
  } catch (error) {
    if (error instanceof AppError) throw error;
    log("error", "ai_request_failed", { purpose, reason: error instanceof Error ? error.message : "unknown" });
    throw new AppError(502, "ai_unavailable", "We couldn't draft that right now. Try again in a minute.");
  }
}
