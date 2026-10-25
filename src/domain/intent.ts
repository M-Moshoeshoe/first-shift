import type { Destination } from "./profile";
import type { Role } from "./roles";

/**
 * What a visitor said they wanted on the home page: find work or post a
 * tryout. Only a hint for the role screen; the person still chooses.
 */
export type Intent = "work" | "business";

const INTENT_ROLE: Record<Intent, Role> = { work: "young_person", business: "business" };

/** Reads ?intent= from a query string. Anything else is ignored. */
export function readIntent(search: string): Intent | null {
  const value = new URLSearchParams(search).get("intent");
  return value === "work" || value === "business" ? value : null;
}

/** Carries the intent to signing in and choosing a role, the only screens that use it. */
export function withIntent(path: Destination, intent: Intent | null): string {
  return intent && (path === "/sign-in" || path === "/onboarding/role") ? `${path}?intent=${intent}` : path;
}

export const intendedRole = (intent: Intent | null): Role | null => (intent ? INTENT_ROLE[intent] : null);
