import { PROFILE_MESSAGES } from "@/domain/messages";
import type { Destination } from "@/domain/profile";
import { fail, ok, type Result } from "@/domain/result";
import { ApiError, apiGet, apiPost } from "@/lib/api";
import { ProfileViewSchema } from "@/schemas/profile";
import { TermsAcceptedSchema } from "@/schemas/terms";

/**
 * Records that the person agreed to the Terms and the Privacy notice (the
 * line under the sign-in buttons), then where they belong, from GET /api/profile, or the message
 * to show if it couldn't be read. Loaded with a dynamic import by the sign-in
 * screen only once someone is signed in, so the schema code never weighs
 * down the page for people who aren't.
 */
export async function fetchDestination(): Promise<Result<Destination, string>> {
  try {
    // Fail closed: no recorded agreement, no way in. Once per version; every later sign-in changes nothing.
    await apiPost("/api/terms/accept", {}, TermsAcceptedSchema);
    return ok((await apiGet("/api/profile", ProfileViewSchema)).destination);
  } catch (caught) {
    return fail(caught instanceof ApiError ? caught.message : PROFILE_MESSAGES.profileUnavailable);
  }
}
