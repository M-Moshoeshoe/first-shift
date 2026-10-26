/**
 * JavaScript budgets per page: the gzipped size of every script the page
 * loads, in KB. scripts/budget.ts measures the production build against these,
 * and npm run check and CI fail when a page goes over. A phase that adds a
 * page adds its budget here. docs/DESIGN.md (Performance) explains why.
 */
export const JS_BUDGETS_KB = {
  "/": 200,
  // Measured 207.2 KB at first; + 10% is 227.9. Held at 220 until the app shell (header with Sign out) and the
  // branded error page, which every page loads, brought it to 219.8 KB (25 October 2026). Then the house rule: 228.
  // Final round (26 October 2026): the navigation bar and the session cover's switch brought it to 228.5 KB; 232 leaves room for copy.
  "/sign-in": 232,
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
  // Phase 4, each measured on its one shell built ahead of time (generateStaticParams), 26 October 2026: the owner's
  // tryout page 256.0 KB, Applications 249.0 KB, the booking page 256.5 KB (257.8 KB with Phase 5; the day's panels load lazily). + 10% is over the cap for each.
  "/business/tryouts/tryout": 260,
  "/work/applications": 260,
  // The young person's profile (how businesses can pay them), measured 245.3 KB on 26 October 2026; + 10% is over the cap.
  "/work/profile": 260,
  "/bookings/booking": 260,
  // The owner's details, for a business from before they were asked (26 October 2026). + 10% is over the cap.
  "/business/owner": 260,
  // The Credits screen, measured 245.8 KB (26 October 2026); + 10% is over the cap.
  "/business/credits": 260,
  // The work record (26 October 2026). + 10% is over the cap.
  "/work/record": 260,
  // The business's own details, read-only (26 October 2026). + 10% is over the cap.
  "/business/profile": 260,
  // The shared work record: a marketing page, no sign-in code. Measured 199.2 KB (26 October 2026); + 10% is 219.
  // The plain public pages (26 October 2026): no JavaScript of their own, the marketing budget.
  "/safety": 200,
  "/privacy": 200,
  "/terms": 200,
  "/contact": 200,
  "/record/token": 219,
  // The trusted contact's status page: a marketing page, no sign-in code, so it keeps the home page's budget. Measured 198.7 KB.
  "/status/token": 200,
} as const;
