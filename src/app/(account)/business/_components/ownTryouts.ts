import type { TryoutStatus } from "@/domain/tryout";
import type { OwnTryout } from "@/lib/useOwnTryouts";

/** The status line on each slip. */
export const STATUS_LINE: Record<TryoutStatus, string> = {
  published: "Live",
  review: "Being checked",
  booked: "Booked",
  completed: "Done",
  withdrawn: "Withdrawn",
};

/** The status line, with how many have applied while a tryout is live: "Live, 2 applied". */
export const statusLine = (tryout: Pick<OwnTryout, "status" | "applicants">): string =>
  tryout.status === "published" ? `${STATUS_LINE.published}, ${tryout.applicants} applied` : STATUS_LINE[tryout.status];

/** Only a tryout nobody is booked on can be withdrawn (domain/tryout.ts); the server checks again. */
export const canWithdraw = (status: TryoutStatus): boolean => status === "review" || status === "published";

const STILL_ON: ReadonlySet<TryoutStatus> = new Set(["review", "published", "booked"]);

/** Tryouts still on come first, soonest first; then the rest, most recent first. */
export function orderTryouts(tryouts: readonly OwnTryout[]): OwnTryout[] {
  const on = tryouts.filter((tryout) => STILL_ON.has(tryout.status)).sort((a, b) => a.startAt.getTime() - b.startAt.getTime());
  const rest = tryouts.filter((tryout) => !STILL_ON.has(tryout.status)).sort((a, b) => b.startAt.getTime() - a.startAt.getTime());
  return [...on, ...rest];
}
