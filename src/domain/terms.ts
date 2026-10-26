/**
 * Agreeing to the Terms and the Privacy notice, recorded once per version at
 * sign-in. The same version again changes nothing, so every sign-in can send
 * it; a new version is recorded as a new agreement.
 */
export type TermsDecision = { kind: "accept" } | { kind: "unchanged" };

export function decideTermsAcceptance(recorded: { version: string } | null, version: string): TermsDecision {
  return recorded?.version === version ? { kind: "unchanged" } : { kind: "accept" };
}
