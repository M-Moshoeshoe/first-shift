/**
 * JavaScript budgets per page: the gzipped size of every script the page
 * loads, in KB. scripts/budget.ts measures the production build against these,
 * and npm run check and CI fail when a page goes over. A phase that adds a
 * page adds its budget here. docs/DESIGN.md (Performance) explains why.
 */
export const JS_BUDGETS_KB = {
  "/": 200,
  "/sign-in": 220,
  // Measured 257.2 KB (24 October 2026), 251.5 KB once the photo code loads lazily; + 10% is over the 260 cap.
  "/onboarding/work": 260,
  // Measured 251.5 KB (24 October 2026); measured + 10% is 276.7, capped at 260.
  "/onboarding/business": 260,
  // Measured 242.9 KB (24 October 2026); measured + 10% is 267.2, capped at 260.
  "/onboarding/role": 260,
  // Each measured 243.0 KB (24 October 2026); measured + 10% is 267.3, capped at 260.
  "/work": 260,
  "/business": 260,
} as const;
