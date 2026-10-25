import { isDemoEmail } from "./demo";

/**
 * How someone signed in, as Firebase reports it on the ID token
 * (firebase.sign_in_provider), and whether that's allowed. Everyone signs in
 * with Google. The demo accounts sign in only through our own server, which
 * checks their public password and mints a custom token
 * (server/services/demoSignInService.ts); a password sign-in straight to
 * Firebase is refused for every account, so changing a demo account's
 * Firebase password gains nothing. A demo account whose email has been moved
 * off the demo domain is refused too.
 */
export function isAllowedSignIn(provider: string | undefined, account: { demo: boolean; email?: string }): boolean {
  if (account.demo) return provider === "custom" && isDemoEmail(account.email);
  // Custom tokens are only ever minted with the server's own credentials (demo sign-in, scripts and checks).
  return provider === "google.com" || provider === "custom";
}
