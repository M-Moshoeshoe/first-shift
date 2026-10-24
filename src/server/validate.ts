import "server-only";
import type { z } from "zod";
import { PROFILE_MESSAGES } from "@/domain/messages";
import { AppError } from "./errors";

/**
 * Reads and validates a JSON body. A field problem shows that field's own
 * message; anything else (not JSON, not an object) shows the plain fallback.
 */
export async function parseBody<T>(request: Request, schema: z.ZodType<T>): Promise<T> {
  let json: unknown;
  try {
    json = await request.json();
  } catch {
    throw new AppError(400, "invalid_input", PROFILE_MESSAGES.fallback);
  }
  const parsed = schema.safeParse(json);
  if (parsed.success) return parsed.data;
  const issue = parsed.error.issues[0];
  const message = issue && issue.path.length > 0 ? issue.message : PROFILE_MESSAGES.fallback;
  throw new AppError(400, "invalid_input", message);
}
