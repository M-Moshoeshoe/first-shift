/**
 * How someone signed in, as Firebase reports it on the ID token
 * (firebase.sign_in_provider). Google is how everyone signs in. A password
 * sign-in is only for the demo accounts that scripts/createDemoAccounts.ts
 * makes, which carry the demo claim: Firebase's sign-up is switched off, and
 * this check holds even if someone switches it back on.
 */
export function isAllowedSignIn(provider: string | undefined, isDemoAccount: boolean): boolean {
  if (provider === "google.com") return true;
  if (provider === "password") return isDemoAccount;
  // Custom tokens are only ever minted with the server's own credentials (scripts and checks).
  return provider === "custom";
}
