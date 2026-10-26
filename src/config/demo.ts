/**
 * The demo accounts judges and testers use. Their emails sit on a domain
 * nobody can own (.demo isn't a real top-level domain), so no password reset
 * or email change can ever be confirmed from an inbox. The passwords are
 * public; demo isolation (domain/demo.ts) is what keeps real people safe.
 */
export const DEMO_EMAIL_DOMAIN = "firstshift.demo";

export const DEMO_ROLES = ["business", "young_person"] as const;
export type DemoRole = (typeof DEMO_ROLES)[number];

/**
 * The demo businesses with no account behind them, there so the demo feed
 * isn't one business long. Their tryouts are examples, for viewing only:
 * nobody could ever answer an application to them. Never real uids: Firebase
 * uids are 28 characters.
 */
export const DEMO_EXAMPLE_OWNERS = ["demo-lerato", "demo-ayanda"] as const;

/**
 * Made-up young people who have applied to Sipho's first tryout, so the owner's
 * list shows what a full one looks like. No account behind them: nobody could
 * ever accept an offer, so offering to them is refused (offers.ts). Never real
 * uids, for the same reason as above.
 */
export const DEMO_EXAMPLE_APPLICANTS = ["demo-applicant-1", "demo-applicant-2", "demo-applicant-3", "demo-applicant-4", "demo-applicant-5", "demo-applicant-6"] as const;
