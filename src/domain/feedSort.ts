import type { FeedItem } from "./nearby";

/** How a young person can order the feed they have loaded. The server sends it soonest first. */
export const FEED_SORTS = ["nearest", "pay", "soonest"] as const;
export type FeedSort = (typeof FEED_SORTS)[number];

export const FEED_SORT_LABELS: Record<FeedSort, string> = { nearest: "Nearest", pay: "Highest pay", soonest: "Soonest" };

type Sortable = Pick<FeedItem, "km" | "payCents" | "startAt">;

const soonest = (a: Sortable, b: Sortable): number => Date.parse(a.startAt) - Date.parse(b.startAt);

const ORDER: Record<FeedSort, (a: Sortable, b: Sortable) => number> = {
  // Unknown distance goes last; ties go to the sooner tryout.
  nearest: (a, b) => (a.km ?? Number.POSITIVE_INFINITY) - (b.km ?? Number.POSITIVE_INFINITY) || soonest(a, b),
  pay: (a, b) => b.payCents - a.payCents || soonest(a, b),
  soonest,
};

/** A sorted copy; the list itself is left as it came. */
export function sortFeed<T extends Sortable>(items: readonly T[], by: FeedSort): T[] {
  return [...items].sort(ORDER[by]);
}
