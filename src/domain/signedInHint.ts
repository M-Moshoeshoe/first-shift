/*
 * A hint for the public pages that someone is signed in on this browser, so
 * the header can say "Open First Shift" without loading any sign-in code. It
 * is only a hint: it holds no identity, just which home to open, and every
 * account screen and route still checks the real sign-in on its own.
 */
export const SIGNED_IN_COOKIE = "fs_signed_in";

export type SignedInHome = "/work" | "/business";

const HOMES: Record<string, SignedInHome> = { work: "/work", business: "/business" };

/** The home to open, from document.cookie; null for no hint or any value we did not write. */
export function homeFromCookies(cookies: string): SignedInHome | null {
  for (const part of cookies.split(";")) {
    const [name, value] = part.trim().split("=");
    if (name === SIGNED_IN_COOKIE) return HOMES[value ?? ""] ?? null;
  }
  return null;
}

/** The cookie's value for a role's home. */
export const cookieValueFor = (home: SignedInHome): string => (home === "/work" ? "work" : "business");
