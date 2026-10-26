import { RULES } from "@/config/rules";
import type { Party } from "./cancellation";
import type { ReviewCase } from "./cases";
import type { StrikeReason } from "./strikes";

/*
 * The review list (npm run review:case): open cases by priority, and how a
 * person resolves one. Every resolution names an outcome and a reason, and
 * every action it takes is checked here and audit-logged by the service.
 */

export const PRIORITIES = ["safety", "payment", "references", "tryouts_and_credits"] as const;
export type Priority = (typeof PRIORITIES)[number];

const SAFETY_REPORTS = new Set(["harassment", "unsafe_work", "asked_for_money"]);
const PAYMENT_REPORTS = new Set(["not_paid", "paid_too_much"]);

/** Safety first, then payment, then references, then tryouts and credit requests. */
export function casePriority(item: ReviewCase): Priority {
  switch (item.kind) {
    case "report":
      return SAFETY_REPORTS.has(item.category) ? "safety" : PAYMENT_REPORTS.has(item.category) ? "payment" : "tryouts_and_credits";
    case "booking_review":
      return item.reason === "safety_stop" ? "safety" : item.reason === "not_received" || item.reason === "unconfirmed" ? "payment" : "tryouts_and_credits";
    case "reference_challenge":
      return "references";
    case "credit_request":
      return "tryouts_and_credits";
  }
}

/** By priority, and within one, the oldest first. */
export function orderCases<T extends { item: ReviewCase; openedAt: Date }>(cases: readonly T[]): T[] {
  const rank = (item: ReviewCase) => PRIORITIES.indexOf(casePriority(item));
  return [...cases].sort((a, b) => rank(a.item) - rank(b.item) || a.openedAt.getTime() - b.openedAt.getTime());
}

export type ReviewAction =
  | { kind: "pause" | "unpause"; party: Party }
  | { kind: "strike"; party: Party; reason: StrikeReason }
  | { kind: "overturn"; strikeId: string }
  | { kind: "reference"; verdict: "uphold" | "reject" }
  | { kind: "grant"; amount: number };

export interface Resolution {
  outcome: string;
  reason: string;
  admin: string;
  actions: ReviewAction[];
}

export type ResolutionProblem = "closed" | "outcome" | "reason" | "admin" | "reference_only" | "no_young_person" | "grant";

/**
 * Whether a person may resolve this case this way. Who each party is comes
 * from the case and, for a report, its booking: an action on a young person
 * the case doesn't name is refused rather than guessed.
 */
export function decideResolution(item: ReviewCase, parties: { businessId: string; workerId: string | null }, resolution: Resolution): { kind: "resolve" } | { kind: "refuse"; problem: ResolutionProblem } {
  if (item.status !== "open") return { kind: "refuse", problem: "closed" };
  if (resolution.outcome.trim().length < 3) return { kind: "refuse", problem: "outcome" };
  if (resolution.reason.trim().length < 3) return { kind: "refuse", problem: "reason" };
  if (!/^[a-z0-9-]{2,40}$/i.test(resolution.admin)) return { kind: "refuse", problem: "admin" };
  for (const action of resolution.actions) {
    if (action.kind === "reference" && item.kind !== "reference_challenge") return { kind: "refuse", problem: "reference_only" };
    if ("party" in action && action.party === "young_person" && !parties.workerId) return { kind: "refuse", problem: "no_young_person" };
    if (action.kind === "grant" && (!Number.isInteger(action.amount) || action.amount < 1 || action.amount > RULES.adminGrantMaxCredits)) return { kind: "refuse", problem: "grant" };
  }
  return { kind: "resolve" };
}

/** The uid each action is about. */
export const subjectOf = (party: Party, parties: { businessId: string; workerId: string | null }): string | null => (party === "business" ? parties.businessId : parties.workerId);

/**
 * Who a case is about. A report names the business and who reported it: the
 * young person when that isn't the business, otherwise the one booked on the
 * tryout. A credit request is about the business alone.
 */
export function caseParties(item: ReviewCase, bookedWorkerId: string | null): { businessId: string; workerId: string | null } {
  switch (item.kind) {
    case "report":
      return { businessId: item.businessId, workerId: item.reporterId !== item.businessId ? item.reporterId : bookedWorkerId };
    case "booking_review":
      return { businessId: item.businessId, workerId: item.workerId };
    case "reference_challenge":
      return { businessId: item.ownerId, workerId: item.workerId };
    case "credit_request":
      return { businessId: item.businessId, workerId: null };
  }
}

/** Why a resolution was refused, for the admin running npm run review:case. */
export const RESOLUTION_PROBLEMS: Record<ResolutionProblem, string> = {
  closed: "That case is already closed.",
  outcome: "Say what was decided with --outcome, at least 3 characters.",
  reason: "Give the reasoning with --reason, at least 3 characters: it goes in the audit log.",
  admin: "Name the admin with --admin <name> (letters, digits and hyphens).",
  reference_only: "--reference works only on a reference challenge.",
  no_young_person: "This case does not name a young person, so nothing can be done to one.",
  grant: `--grant takes a whole number from 1 to ${RULES.adminGrantMaxCredits}.`,
};
