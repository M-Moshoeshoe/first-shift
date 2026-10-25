/**
 * The app's navigation for each role, in order: a bottom tab bar on phones and
 * links in the header on desktop. Only routes that exist (tests/unit/nav.test.ts
 * checks each has a page). The bar appears once a role has NAV_MIN_ITEMS.
 */
export const NAV = {
  young_person: [
    { href: "/work", label: "Tryouts", badge: false },
    // The badge counts offers waiting for an answer.
    { href: "/work/applications", label: "Applications", badge: true },
  ],
  business: [
    // The badge counts new applicants the owner hasn't looked at yet.
    { href: "/business", label: "Tryouts", badge: true },
    { href: "/business/post", label: "Post", badge: false },
  ],
} as const satisfies Record<"young_person" | "business", readonly { href: string; label: string; badge: boolean }[]>;

export type NavItem = (typeof NAV)[keyof typeof NAV][number];

/** A one-item bar would only take space from the screen. */
export const NAV_MIN_ITEMS = 2;
