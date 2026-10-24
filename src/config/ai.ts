/** The Claude model used for drafting, classifying and writing references. */
export const AI_MODEL = "claude-haiku-5-5";

/**
 * Claude Haiku 5.5 thinks before it answers, and thinking counts toward
 * max_tokens, so each cap leaves room for it as well as the JSON. Low effort
 * suits short drafting and classification; npm run eval:ai checks it holds.
 */
export const AI_EFFORT = "low";

export const AI_LIMITS = {
  draftMaxTokens: 2000,
  classifyMaxTokens: 1024,
  referenceMaxTokens: 1500,
  /** Requests per user per day across all AI routes. Overridable by env. */
  defaultDailyRequestsPerUser: 30,
} as const;
