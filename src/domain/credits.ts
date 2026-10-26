import { RULES } from "@/config/rules";

/**
 * Prepaid tryout credits, as an append-only ledger (docs/RULES.md, Tryout
 * credits). A grant adds credits; a hold reserves one for a booked tryout; a
 * use spends the held credit when the tryout is completed; a release returns
 * it if the booking is cancelled. Entries are only ever added, never changed.
 */
export type CreditEntry =
  // welcome: the free credits; top_up: bought (once top-ups open); granted: added by First Shift on request (npm run credits:grant).
  | { kind: "grant"; amount: number; reason: "welcome" | "top_up" | "granted" }
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

/** The free credits not yet spent: they're spent first, so they're what's left of the welcome grant after every use and hold. */
export function freeLeft(entries: readonly CreditEntry[]): number {
  const welcome = entries.reduce((sum, entry) => (entry.kind === "grant" && entry.reason === "welcome" ? sum + entry.amount : sum), 0);
  const { used, held } = creditBalance(entries);
  return Math.max(0, welcome - used - held);
}

export type CreditEventKind = "granted" | "held" | "used" | "returned" | "requested";

/** One line of the Credits screen's history, newest first. */
export interface CreditEvent {
  kind: CreditEventKind;
  at: Date;
  /** Credits added, for a grant; 1 otherwise. */
  amount: number;
  /** The free credits, or credits added on request: said differently. */
  free: boolean;
  /** The tryout a hold, use or return was for, when it's known. */
  tryoutTitle: string | null;
  /** What it did to the credits available: +3 for a grant, -1 for a hold, +1 for a return, 0 for a use (already set aside) or a request. */
  change: number;
  /** Credits available just after it. */
  balance: number;
}

const CHANGE: Record<CreditEventKind, (amount: number) => number> = { granted: (amount) => amount, held: () => -1, used: () => 0, returned: () => 1, requested: () => 0 };

/** The ledger and the requests as one history in plain words (creditsCopy.ts), newest first. */
export function creditHistory(entries: readonly { entry: CreditEntry; at: Date }[], requests: readonly Date[], titles: ReadonlyMap<string, string>): CreditEvent[] {
  const kinds = { grant: "granted", hold: "held", use: "used", release: "returned" } as const;
  const fromLedger = entries.map(({ entry, at }) => ({
    kind: kinds[entry.kind],
    at,
    amount: entry.kind === "grant" ? entry.amount : 1,
    free: entry.kind === "grant" && entry.reason === "welcome",
    tryoutTitle: entry.kind === "grant" ? null : (titles.get(entry.tryoutId) ?? null),
  }));
  const asked = requests.map((at) => ({ kind: "requested" as const, at, amount: 0, free: false, tryoutTitle: null }));
  // Oldest first to carry the balance forward, then newest first for the screen.
  let balance = 0;
  return [...fromLedger, ...asked]
    .sort((a, b) => a.at.getTime() - b.at.getTime())
    .map((event): CreditEvent => {
      const change = CHANGE[event.kind](event.amount);
      balance += change;
      return { ...event, change, balance };
    })
    .reverse();
}

export type CreditRequestDecision = { kind: "request" } | { kind: "unchanged" } | { kind: "refuse"; problem: "not_business" };

/** A business asks for more credits: one request open at a time, so a second tap changes nothing. */
export function decideCreditRequest(isBusiness: boolean, openRequest: boolean): CreditRequestDecision {
  if (!isBusiness) return { kind: "refuse", problem: "not_business" };
  return openRequest ? { kind: "unchanged" } : { kind: "request" };
}

export type GrantProblem = "amount" | "reason" | "not_business";

/** An admin adds credits (npm run credits:grant): a whole number from 1 to the limit, always with a reason. */
export function decideAdminGrant(isBusiness: boolean, amount: number, reason: string): { kind: "append"; entries: CreditEntry[] } | { kind: "refuse"; problem: GrantProblem } {
  if (!isBusiness) return { kind: "refuse", problem: "not_business" };
  if (!Number.isInteger(amount) || amount < 1 || amount > RULES.adminGrantMaxCredits) return { kind: "refuse", problem: "amount" };
  if (reason.trim().length < 3) return { kind: "refuse", problem: "reason" };
  return { kind: "append", entries: [{ kind: "grant", amount, reason: "granted" }] };
}
