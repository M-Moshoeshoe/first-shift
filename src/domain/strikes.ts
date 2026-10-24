import { RULES } from "@/config/rules";
import { addDays } from "./time";

export type StrikeReason = "no_show" | "late_cancellation" | "false_payment_claim" | "upheld_safety_report";

export interface Strike {
  at: Date;
  reason: StrikeReason;
  /** A strike removed on review no longer counts. */
  overturned?: boolean;
}

export type AccountStatus = "active" | "paused" | "suspended";

export interface StatusInput {
  now: Date;
  strikes: Strike[];
  /** Businesses only: a tryout not marked paid in time, or reported as not received. */
  hasUnresolvedUnpaid?: boolean;
  hasOpenSafetyReport?: boolean;
}

export interface StatusResult {
  status: AccountStatus;
  activeStrikes: number;
  reasons: string[];
}

/** Strikes expire after 90 days, so one bad week doesn't end anyone's chances. */
export function activeStrikes(strikes: Strike[], now: Date): Strike[] {
  const windowStart = addDays(now, -RULES.strikeWindowDays);
  return strikes.filter((strike) => !strike.overturned && strike.at > windowStart && strike.at <= now);
}

export function accountStatus({ now, strikes, hasUnresolvedUnpaid = false, hasOpenSafetyReport = false }: StatusInput): StatusResult {
  const count = activeStrikes(strikes, now).length;
  const reasons: string[] = [];

  if (count >= RULES.strikesToSuspend) {
    reasons.push(`${count} strikes in the last ${RULES.strikeWindowDays} days`);
    return { status: "suspended", activeStrikes: count, reasons };
  }
  if (hasUnresolvedUnpaid) reasons.push("A tryout hasn't been paid yet");
  if (hasOpenSafetyReport) reasons.push("A safety report is being reviewed");
  return { status: reasons.length > 0 ? "paused" : "active", activeStrikes: count, reasons };
}

export const canTakePart = (status: AccountStatus): boolean => status === "active";
