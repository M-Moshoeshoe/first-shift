import { RULES } from "@/config/rules";

/**
 * Prepaid tryout credits, as an append-only ledger (docs/RULES.md, Tryout
 * credits). A grant adds credits; a hold reserves one for a booked tryout; a
 * use spends the held credit when the tryout is completed; a release returns
 * it if the booking is cancelled. Entries are only ever added, never changed.
 */
export type CreditEntry =
  | { kind: "grant"; amount: number; reason: "welcome" | "top_up" }
  | { kind: "hold"; tryoutId: string }
  | { kind: "use"; tryoutId: string }
  | { kind: "release"; tryoutId: string };

export type CreditProblem = "no_credits" | "not_held";

/** A decision: append these entries, change nothing (a retry), or refuse. */
export type CreditDecision = { kind: "append"; entries: CreditEntry[] } | { kind: "unchanged" } | { kind: "refuse"; problem: CreditProblem };

/** The latest hold, use or release for one tryout, in ledger order. */
function lastFor(entries: readonly CreditEntry[], tryoutId: string): CreditEntry["kind"] | null {
  let last: CreditEntry["kind"] | null = null;
  for (const entry of entries) if (entry.kind !== "grant" && entry.tryoutId === tryoutId) last = entry.kind;
  return last;
}

export interface CreditBalance {
  granted: number;
  used: number;
  /** Holds not yet used or released. */
  held: number;
  available: number;
  /** True until any credit is bought: the dashboard says "Free tryouts left" instead of "Credits". */
  onlyFree: boolean;
}

export function creditBalance(entries: readonly CreditEntry[]): CreditBalance {
  let granted = 0;
  let used = 0;
  let onlyFree = true;
  const tryouts = new Set<string>();
  for (const entry of entries) {
    if (entry.kind === "grant") {
      granted += entry.amount;
      if (entry.reason !== "welcome") onlyFree = false;
    } else {
      tryouts.add(entry.tryoutId);
      if (entry.kind === "use") used += 1;
    }
  }
  const held = [...tryouts].filter((id) => lastFor(entries, id) === "hold").length;
  return { granted, used, held, available: Math.max(0, granted - used - held), onlyFree };
}

/** Posting (and drafting) needs at least one available credit. */
export const canPost = (entries: readonly CreditEntry[]): boolean => creditBalance(entries).available > 0;

/** The free credits, once: granted when the business profile is complete and never again. */
export function decideWelcomeGrant(complete: boolean, entries: readonly CreditEntry[]): CreditDecision {
  if (!complete || entries.some((entry) => entry.kind === "grant" && entry.reason === "welcome")) return { kind: "unchanged" };
  return { kind: "append", entries: [{ kind: "grant", amount: RULES.freeCredits, reason: "welcome" }] };
}

/** At booking: reserve one credit for the tryout. Holding twice changes nothing. */
export function decideHold(entries: readonly CreditEntry[], tryoutId: string): CreditDecision {
  const last = lastFor(entries, tryoutId);
  if (last === "hold" || last === "use") return { kind: "unchanged" };
  if (creditBalance(entries).available < 1) return { kind: "refuse", problem: "no_credits" };
  return { kind: "append", entries: [{ kind: "hold", tryoutId }] };
}

/** At completion: spend the held credit. Only a held credit can be used; using twice changes nothing. */
export function decideUse(entries: readonly CreditEntry[], tryoutId: string): CreditDecision {
  const last = lastFor(entries, tryoutId);
  if (last === "use") return { kind: "unchanged" };
  if (last !== "hold") return { kind: "refuse", problem: "not_held" };
  return { kind: "append", entries: [{ kind: "use", tryoutId }] };
}

/** When a booking is cancelled: return the held credit. Nothing held means nothing to do. */
export function decideRelease(entries: readonly CreditEntry[], tryoutId: string): CreditDecision {
  return lastFor(entries, tryoutId) === "hold" ? { kind: "append", entries: [{ kind: "release", tryoutId }] } : { kind: "unchanged" };
}
