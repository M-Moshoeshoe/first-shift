import { z } from "zod";
import { clientAuth } from "./firebaseClient";

/** An error the person can act on. message is always safe to show as it is. */
export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
  ) {
    super(message);
  }
}

const TIMEOUT_MS = 20_000;
const ServerErrorSchema = z.object({ error: z.string(), message: z.string().min(1) });

/** The server's own public message when it sent one, otherwise a plain sentence for the status. */
export function errorFromResponse(status: number, body: unknown): ApiError {
  const parsed = ServerErrorSchema.safeParse(body);
  if (parsed.success) return new ApiError(status, parsed.data.error, parsed.data.message);
  if (status === 401) return new ApiError(status, "not_signed_in", "Your session has ended. Sign in again.");
  if (status === 429) return new ApiError(status, "too_many_requests", "You've done that too many times today. Try again tomorrow.");
  return new ApiError(status, "server_error", "Something went wrong on our side. Try again in a minute.");
}

/**
 * The one way the browser calls our server. Attaches the signed-in user's ID
 * token, sends JSON, and checks the reply against schema. Every failure
 * becomes an ApiError with a message to show the person. Components never
 * call fetch directly.
 */
export async function apiPost<T>(path: string, body: unknown, schema: z.ZodType<T>): Promise<T> {
  const user = clientAuth().currentUser;
  if (!user) throw new ApiError(401, "not_signed_in", "Sign in to continue.");

  let response: Response;
  try {
    response = await fetch(path, {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${await user.getIdToken()}` },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
  } catch (error) {
    const timedOut = error instanceof DOMException && error.name === "TimeoutError";
    throw timedOut
      ? new ApiError(0, "timeout", "First Shift took too long to answer. Check your connection, then try again.")
      : new ApiError(0, "offline", "We couldn't reach First Shift. Check your connection, then try again.");
  }

  const json: unknown = await response.json().catch(() => null);
  if (!response.ok) throw errorFromResponse(response.status, json);

  const parsed = schema.safeParse(json);
  if (!parsed.success) throw new ApiError(response.status, "bad_response", "First Shift sent a reply this page couldn't read. Reload the page and try again.");
  return parsed.data;
}
