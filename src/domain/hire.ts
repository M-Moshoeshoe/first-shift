import { RULES } from "@/config/rules";
import { crossesRegularEmploymentLine, type WorkedSlot } from "./regularEmployment";

/** After three tryouts with the same person, prompt the owner to offer a job. */
export function shouldPromptHire(completedWithSamePerson: number, alreadyOffered: boolean): boolean {
  return !alreadyOffered && completedWithSamePerson >= RULES.hirePromptAfterTryouts;
}

/**
 * "Offer {name} a job", once per pair: after three completed tryouts
 * together, or when even the shortest tryout more this month would reach the
 * 24-hour line (regularEmployment.ts), so a job is the only way to keep
 * working together. Recorded once, counted in the pilot metrics.
 */
export function hireOfferDue(completedTogether: number, pairSlots: readonly WorkedSlot[], now: Date, alreadyOffered: boolean): boolean {
  if (alreadyOffered) return false;
  return shouldPromptHire(completedTogether, false) || crossesRegularEmploymentLine(pairSlots, { startAt: now, hours: RULES.minPaidHours });
}

export interface HireOfferRecord {
  ownerId: string;
  workerId: string;
  businessName: string;
  bookingId: string;
  demo: boolean;
  at: Date;
}

/** hireOffers/{ownerId}_{workerId}: one per pair, so an offer can't be counted twice. */
export const hireOfferId = (ownerId: string, workerId: string): string => `${ownerId}_${workerId}`;
