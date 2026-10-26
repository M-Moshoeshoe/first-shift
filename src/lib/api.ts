import * as z from "zod/mini";
import { safeParse, type $ZodType } from "zod/v4/core";
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
export const OFFLINE_MESSAGE = "We could not reach First Shift. Check your connection, then try again.";
// zod/mini in the browser: the full build would add about 20 KB to every account page (docs/DESIGN.md, Performance).
const ServerErrorSchema = z.object({ error: z.string(), message: z.string().check(z.minLength(1)) });

/** The server's own public message when it sent one, otherwise a plain sentence for the status. */
export function errorFromResponse(status: number, body: unknown): ApiError {
  const parsed = safeParse(ServerErrorSchema, body);
  if (parsed.success) return new ApiError(status, parsed.data.error, parsed.data.message);
  if (status === 401) return new ApiError(status, "not_signed_in", "Your session has ended. Sign in again.");
  if (status === 429) return new ApiError(status, "too_many_requests", "You've done that too many times today. Try again tomorrow.");
  return new ApiError(status, "server_error", "Something went wrong on our side. Try again in a minute.");
}

/**
 * The one way the browser calls our server. Attaches the signed-in user's ID
 * token, sends JSON, and checks the reply against schema. Every failure
 * becomes an ApiError with a message to show the person. Components never
 * call fetch directly; they use apiGet and apiPost.
 */
async function request<T>(method: "GET" | "POST", path: string, schema: $ZodType<T>, body?: unknown, signedIn = true): Promise<T> {
  const user = signedIn ? clientAuth().currentUser : null;
  if (signedIn && !user) throw new ApiError(401, "not_signed_in", "Sign in to continue.");

  let response: Response;
  try {
    const authorization: Record<string, string> = user ? { authorization: `Bearer ${await user.getIdToken()}` } : {};
    response = await fetch(path, {
      method,
      headers: method === "POST" ? { "content-type": "application/json", ...authorization } : authorization,
      body: method === "POST" ? JSON.stringify(body) : undefined,
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
  } catch (error) {
    const timedOut = error instanceof DOMException && error.name === "TimeoutError";
    throw timedOut ? new ApiError(0, "timeout", "First Shift took too long to answer. Check your connection, then try again.") : new ApiError(0, "offline", OFFLINE_MESSAGE);
  }

  const json: unknown = await response.json().catch(() => null);
  if (!response.ok) throw errorFromResponse(response.status, json);

  const parsed = safeParse(schema, json);
  if (!parsed.success) throw new ApiError(response.status, "bad_response", "First Shift sent a reply this page could not read. Reload the page and try again.");
  return parsed.data;
}

export const apiGet = <T>(path: string, schema: $ZodType<T>): Promise<T> => request("GET", path, schema);
export const apiPost = <T>(path: string, body: unknown, schema: $ZodType<T>): Promise<T> => request("POST", path, schema, body);
/** The one call made before anyone is signed in: the demo sign-in. */
export const apiPostSignedOut = <T>(path: string, body: unknown, schema: $ZodType<T>): Promise<T> => request("POST", path, schema, body, false);
