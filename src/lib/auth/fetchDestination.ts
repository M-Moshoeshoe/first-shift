import { PROFILE_MESSAGES } from "@/domain/messages";
import type { Destination } from "@/domain/profile";
import { fail, ok, type Result } from "@/domain/result";
import { ApiError, apiGet } from "@/lib/api";
import { ProfileViewSchema } from "@/schemas/profile";

/**
 * Where the signed-in person belongs, from GET /api/profile, or the message
 * to show if it couldn't be read. Loaded with a dynamic import by the sign-in
 * screen only once someone is signed in, so the schema code never weighs
 * down the page for people who aren't.
 */
export async function fetchDestination(): Promise<Result<Destination, string>> {
  try {
    return ok((await apiGet("/api/profile", ProfileViewSchema)).destination);
  } catch (caught) {
    return fail(caught instanceof ApiError ? caught.message : PROFILE_MESSAGES.profileUnavailable);
  }
}
