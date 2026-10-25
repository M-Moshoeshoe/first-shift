import type { Party } from "./cancellation";
import { decideRelease, decideUse, type CreditDecision, type CreditEntry } from "./credits";
import type { Cents } from "./money";
import { payOwed, type EndReason, type PayOwed } from "./pay";
import type { StrikeReason } from "./strikes";

/**
 * Everything that can end a booked tryout (docs/MONEY.md). Each event is
 * already classified: whether a cancellation was free or late comes from
 * cancellation.ts, and a no-show or a safety stop from the people involved.
 */
export type SettleEvent =
  | { kind: "completed" | "finished_early" | "business_ended_early" | "business_late_cancel" | "business_no_show"; rateCentsPerHour: Cents; agreedHours: number }
  | { kind: "worker_left_early" | "safety"; rateCentsPerHour: Cents; agreedHours: number; minutesWorked: number }
  | { kind: "free_cancel"; by: Party }
  | { kind: "worker_late_cancel" | "worker_no_show" };

export type SettleKind = SettleEvent["kind"];

export interface Settlement {
  /** What the business owes the young person, or null when nothing is owed. */
  wage: PayOwed | null;
  /** The one rule: the credit is used whenever the young person is owed money, and returned when nothing is owed. */
  credit: "use" | "release";
  strike: { party: Party; reason: StrikeReason } | null;
}

const STRIKES: Partial<Record<SettleKind, Settlement["strike"]>> = {
  business_late_cancel: { party: "business", reason: "late_cancellation" },
  business_no_show: { party: "business", reason: "no_show" },
  worker_late_cancel: { party: "young_person", reason: "late_cancellation" },
  worker_no_show: { party: "young_person", reason: "no_show" },
};

/** The wage for an event, from pay.ts, which holds every pay rule. Nothing is owed when the tryout didn't happen through no fault of the business. */
function wageFor(event: SettleEvent): PayOwed | null {
  switch (event.kind) {
    case "worker_left_early":
    case "safety":
      return payOwed({ rateCentsPerHour: event.rateCentsPerHour, agreedHours: event.agreedHours, minutesWorked: event.minutesWorked, endReason: event.kind });
    case "free_cancel":
    case "worker_late_cancel":
    case "worker_no_show":
      return null;
    default: {
      const endReason: EndReason = event.kind;
      // The young person worked the whole day, or was owed it: minutes worked don't change these amounts.
      return payOwed({ rateCentsPerHour: event.rateCentsPerHour, agreedHours: event.agreedHours, minutesWorked: event.agreedHours * 60, endReason });
    }
  }
}

/** What an event settles: the wage owed, the credit effect and any strike. */
export function settle(event: SettleEvent): Settlement {
  const wage = wageFor(event);
  return { wage, credit: wage && wage.amountCents > 0 ? "use" : "release", strike: STRIKES[event.kind] ?? null };
}

/** The ledger entry the settlement makes for this tryout (credits.ts): use the held credit, or return it. */
export function settlementCredit(settlement: Settlement, entries: readonly CreditEntry[], tryoutId: string): CreditDecision {
  return settlement.credit === "use" ? decideUse(entries, tryoutId) : decideRelease(entries, tryoutId);
}
