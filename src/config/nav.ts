/**
 * The app's navigation for each role, in order: a bottom tab bar on phones and
 * links in the header on desktop. Only routes that exist (tests/unit/nav.test.ts
 * checks each has a page). The bar appears once a role has NAV_MIN_ITEMS; the
 * business items arrive with the posting screen.
 */
export const NAV = {
  young_person: [{ href: "/work", label: "Tryouts" }],
  business: [{ href: "/business", label: "Tryouts" }],
} as const satisfies Record<"young_person" | "business", readonly { href: string; label: string }[]>;

export type NavItem = (typeof NAV)[keyof typeof NAV][number];

/** A one-item bar would only take space from the screen. */
export const NAV_MIN_ITEMS = 2;
