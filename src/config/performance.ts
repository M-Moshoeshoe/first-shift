/**
 * JavaScript budgets per page: the gzipped size of every script the page
 * loads, in KB. scripts/budget.ts measures the production build against these,
 * and npm run check and CI fail when a page goes over. A phase that adds a
 * page adds its budget here. docs/DESIGN.md (Performance) explains why.
 */
export const JS_BUDGETS_KB = {
  "/": 200,
  // Measured 207.2 KB at first; + 10% is 227.9. Held at 220 until the app shell (header with Sign out) and the
  // branded error page, which every page loads, brought it to 219.8 KB (25 October 2026). Now the house rule: 228.
  "/sign-in": 228,
  // Measured 257.2 KB (24 October 2026), 251.5 KB once the photo code loads lazily; + 10% is over the 260 cap.
  "/onboarding/work": 260,
  // Measured 251.5 KB (24 October 2026); measured + 10% is 276.7, capped at 260.
  "/onboarding/business": 260,
  // Measured 242.9 KB (24 October 2026); measured + 10% is 267.2, capped at 260.
  "/onboarding/role": 260,
  // Measured 247.0 KB (25 October 2026, the nearby feed); measured + 10% is over the 260 cap.
  "/work": 260,
  // The tryout detail page, measured on the one shell built ahead of time (generateStaticParams); every id
  // loads the same scripts. Measured 247.9 KB (25 October 2026); measured + 10% is over the cap.
  "/work/tryouts/tryout": 260,
  // Measured 244.5 KB (25 October 2026, the dashboard): the withdraw sheet (React Aria, 20.9 KB) and the
  // Firestore listener (171.8 KB) load after the page has drawn and aren't in this figure. + 10% is over the cap.
  "/business": 260,
  // Measured 249.3 KB (25 October 2026); measured + 10% is 274.2, capped at 260.
  "/business/post": 260,
} as const;
