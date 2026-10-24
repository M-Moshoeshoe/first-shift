/**
 * JavaScript budgets per page: the gzipped size of every script the page
 * loads, in KB. scripts/budget.ts measures the production build against these,
 * and npm run check and CI fail when a page goes over. A phase that adds a
 * page adds its budget here. docs/DESIGN.md (Performance) explains why.
 */
export const JS_BUDGETS_KB = {
  "/": 200,
  "/sign-in": 220,
  // Measured 257.2 KB (24 October 2026); measured + 10% is 282.9, capped at 260.
  "/onboarding/work": 260,
} as const;
