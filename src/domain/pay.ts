import { RULES } from "@/config/rules";
import { multiplyCents, type Cents } from "./money";
import { fail, ok, type Result } from "./result";

export type EndReason =
  | "completed"
  | "finished_early"
  | "worker_left_early"
  | "business_ended_early"
  | "safety"
  | "business_late_cancel"
  | "business_no_show";

export type PayProblem = "below_minimum_wage" | "too_few_hours" | "too_many_hours";

export interface PayOwed {
  /** What the app pre-fills for the owner. */
  amountCents: Cents;
  /** The lowest amount the owner may enter. Paying more is always allowed. */
  minimumCents: Cents;
  /** Whether the case goes to review before the amount is final. */
  needsReview: boolean;
}

export function agreedPayCents(rateCentsPerHour: Cents, hours: number): Result<Cents, PayProblem> {
  if (rateCentsPerHour < RULES.minimumWageCentsPerHour) return fail("below_minimum_wage");
  if (hours < RULES.minPaidHours) return fail("too_few_hours");
  if (hours > RULES.maxTryoutHours) return fail("too_many_hours");
  return ok(multiplyCents(rateCentsPerHour, hours));
}

/** Minutes worked, rounded up to the next quarter hour, as billable hours. */
export function billableHours(minutesWorked: number): number {
  return Math.ceil(Math.max(0, minutesWorked) / 15) / 4;
}

interface PayInput {
  rateCentsPerHour: Cents;
  agreedHours: number;
  minutesWorked: number;
  endReason: EndReason;
}

/** Works out what the owner owes, so neither side has to argue about the amount. */
export function payOwed({ rateCentsPerHour, agreedHours, minutesWorked, endReason }: PayInput): PayOwed {
  const full = multiplyCents(rateCentsPerHour, agreedHours);
  const fourHourMinimum = multiplyCents(rateCentsPerHour, RULES.minPaidHours);
  const workedWithFloor = Math.min(full, Math.max(fourHourMinimum, multiplyCents(rateCentsPerHour, billableHours(minutesWorked))));

  switch (endReason) {
    case "completed":
    case "finished_early":
    case "business_ended_early":
      return { amountCents: full, minimumCents: full, needsReview: false };
    case "worker_left_early":
      return { amountCents: full, minimumCents: workedWithFloor, needsReview: false };
    case "safety":
      return { amountCents: workedWithFloor, minimumCents: workedWithFloor, needsReview: true };
    case "business_late_cancel":
    case "business_no_show":
      return { amountCents: fourHourMinimum, minimumCents: fourHourMinimum, needsReview: endReason === "business_no_show" };
  }
}

export function isAcceptedAmount(enteredCents: Cents, owed: PayOwed): boolean {
  return Number.isInteger(enteredCents) && enteredCents >= owed.minimumCents;
}
