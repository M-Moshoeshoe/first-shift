import { cookieValueFor, SIGNED_IN_COOKIE, type SignedInHome } from "@/domain/signedInHint";

// First-party, Lax, 30 days at most; Secure wherever the page is served over HTTPS. Not HttpOnly: the public header reads it.
const attributes = () => `Path=/; SameSite=Lax${window.location.protocol === "https:" ? "; Secure" : ""}`;

/** Called once the profile says where this person belongs. */
export function setSignedInHint(home: SignedInHome): void {
  document.cookie = `${SIGNED_IN_COOKIE}=${cookieValueFor(home)}; Max-Age=2592000; ${attributes()}`;
}

/** Called whenever nobody is signed in, including after Sign out. */
export function clearSignedInHint(): void {
  document.cookie = `${SIGNED_IN_COOKIE}=; Max-Age=0; ${attributes()}`;
}
