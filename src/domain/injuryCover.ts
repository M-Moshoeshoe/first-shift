/**
 * Injury cover under COIDA (docs/COMPLIANCE.md): the business is the employer
 * on the tryout day, and every employer must register with the Compensation
 * Fund. The owner answers once, in business onboarding. We don't check the
 * answer with the Fund yet, so a tryout says who confirmed it.
 */
export const COIDA_ANSWERS = ["registered", "not_registered", "not_sure"] as const;
export type CoidaAnswer = (typeof COIDA_ANSWERS)[number];

export const COIDA_OPTION_LABELS: Record<CoidaAnswer, string> = {
  registered: "Yes, we're registered",
  not_registered: "No, not registered",
  not_sure: "I'm not sure",
};

export const COIDA_QUESTION = {
  legend: "Are you registered with the Compensation Fund (COIDA)?",
  hint: "It covers anyone injured while working for you, a tryout included. Every employer must register.",
} as const;

/** The line every tryout shows. Only a business that says it's registered counts as confirmed. */
export function injuryCoverLine(answer: CoidaAnswer | undefined): string {
  return answer === "registered" ? "Injury cover: confirmed by the business" : "Injury cover: not confirmed";
}
