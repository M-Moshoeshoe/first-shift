import "server-only";
import { safeParse, type $ZodType } from "zod/v4/core";
import { PROFILE_MESSAGES } from "@/domain/messages";
import { AppError } from "./errors";

/**
 * Reads and validates a JSON body. A field problem shows that field's own
 * message; anything else (not JSON, not an object) shows the plain fallback.
 */
export async function parseBody<T>(request: Request, schema: $ZodType<T>): Promise<T> {
  let json: unknown;
  try {
    json = await request.json();
  } catch {
    throw new AppError(400, "invalid_input", PROFILE_MESSAGES.fallback);
  }
  // The functional form takes the full Zod build and its small build (zod/mini) alike.
  const parsed = safeParse(schema, json);
  if (parsed.success) return parsed.data;
  const issue = parsed.error.issues[0];
  const message = issue && issue.path.length > 0 ? issue.message : PROFILE_MESSAGES.fallback;
  throw new AppError(400, "invalid_input", message);
}

const ID_PATTERN = /^[A-Za-z0-9_-]{1,128}$/;

/** An id from a route's address. Anything that isn't one reads as not found, with the message the route chose. */
export function parseId(raw: string, notFoundMessage: string): string {
  if (!ID_PATTERN.test(raw)) throw new AppError(404, "not_found", notFoundMessage);
  return raw;
}
