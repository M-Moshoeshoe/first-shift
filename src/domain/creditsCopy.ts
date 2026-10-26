import { RULES } from "@/config/rules";
import { BUTTON_LABELS } from "./buttonLabels";
import type { CreditEvent, GrantProblem } from "./credits";
import { formatRand } from "./money";

/*
 * The Credits screen's words: the balance, the history in plain words, the
 * request, and the launch prices as text only (no gateway yet, so no button
 * that can't work). Copy rules: AGENTS.md.
 */

const rand = (cents: number) => formatRand(cents).replace(/\.00$/, "");
const credits = (count: number) => `${count} ${count === 1 ? "credit" : "credits"}`;

export const CREDITS_COPY = {
  title: "Credits",
  intro: `Each completed tryout uses one credit. Your first ${RULES.freeCredits} are free.`,
  available: "Available",
  held: "Set aside for booked tryouts",
  free: "Free credits left",
  howItWorks: "A credit is set aside when you book someone, used once the tryout is done, and returned when nothing is owed.",
  history: "History",
  empty: "Nothing here yet.",
  request: BUTTON_LABELS.requestMoreCredits,
  requesting: "Sending your request",
  requested: (day: string) => `Requested on ${day}. We'll add them and let you know.`,
  launch: `At launch: 5 tryouts for ${rand(5 * RULES.creditPriceCents)} or 10 for ${rand(10 * RULES.creditPriceCents)}, by card or Instant EFT.`,
  packsTitle: "Credit packs",
  packsNote: "At launch, by card or Instant EFT. Paying online is not open yet: tap Request more credits and we'll add them.",
  unavailable: "Your credits did not load. Check your connection, then tap Try again.",
  seeCredits: "See your credits",
  balanceAfter: (balance: number) => `${balance} left`,
} as const;

/** One line of the history, without its date (the screen shows that beside it). */
export function historyLine(event: CreditEvent): string {
  const tryout = event.tryoutTitle ?? "a booked tryout";
  switch (event.kind) {
    case "granted":
      return event.free ? `${credits(event.amount)} added, free` : `${credits(event.amount)} added by First Shift`;
    case "held":
      return `1 credit set aside for ${tryout}`;
    case "used":
      return `1 credit used: ${tryout}`;
    case "returned":
      return `1 credit returned: ${tryout}`;
    case "requested":
      return "You asked for more credits";
  }
}

/** Why npm run credits:grant refused, for the admin running it. */
export const GRANT_PROBLEMS: Record<GrantProblem, string> = {
  amount: `The amount must be a whole number from 1 to ${RULES.adminGrantMaxCredits}.`,
  reason: "Give a reason with --reason, at least 3 characters: it goes in the audit log.",
  not_business: "That uid is not a business.",
};

/** The packs on the Credits screen, as information only until top-ups open (docs/MONEY.md). */
export const CREDIT_PACKS = [5, 10].map((credits) => ({ credits, price: rand(credits * RULES.creditPriceCents) }));
