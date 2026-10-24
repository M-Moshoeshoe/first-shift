/** The Claude model used for drafting, classifying and writing references. */
export const AI_MODEL = "claude-haiku-5-5";

export const AI_LIMITS = {
  draftMaxTokens: 600,
  classifyMaxTokens: 200,
  referenceMaxTokens: 300,
  /** Requests per user per day across all AI routes. Overridable by env. */
  defaultDailyRequestsPerUser: 30,
} as const;
