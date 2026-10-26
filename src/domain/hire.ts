import { RULES } from "@/config/rules";
import type { Cents } from "./money";
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

/** Invite them to talk about a job, or offer one with its details. */
export const HIRE_KINDS = ["talk", "offer"] as const;
export type HireKind = (typeof HIRE_KINDS)[number];
/** The young person's answer. Not right now changes nothing else: tryouts go on, and the 24-hour line still applies. */
export const HIRE_ANSWERS = ["interested", "not_now"] as const;
export type HireAnswer = (typeof HIRE_ANSWERS)[number];
/** What the owner marks later, for the pilot's tryout-to-job count. */
export const HIRE_OUTCOMES = ["hired", "did_not_work_out"] as const;
export type HireOutcome = (typeof HIRE_OUTCOMES)[number];

export interface JobDetails {
  role: string;
  daysPerWeek: number;
  rateCentsPerHour: Cents;
}

export interface HireOfferRecord {
  ownerId: string;
  workerId: string;
  businessName: string;
  bookingId: string;
  demo: boolean;
  at: Date;
  kind: HireKind;
  /** Only for an offer: the role, days a week and hourly pay, at least the minimum wage. */
  details: JobDetails | null;
  /** The owner's own words, optional. */
  message: string;
  answer: HireAnswer | null;
  outcome: HireOutcome | null;
  /** From the booking, so each side can message the other about it: first names and the owner's number. */
  workerFirstName: string;
  ownerFirstName: string;
  ownerPhone: string | null;
}

/** hireOffers/{ownerId}_{workerId}: one per pair, so an offer can't be counted twice. */
export const hireOfferId = (ownerId: string, workerId: string): string => `${ownerId}_${workerId}`;

export type JobOfferInput = { kind: "talk"; message: string } | { kind: "offer"; message: string; role: string; daysPerWeek: number; rateCentsPerHour: number };
export type JobOfferProblem = "role" | "days" | "below_minimum_wage" | "message";

/** What the owner sent, checked in code: a role, 1 to 6 days a week, and never below the minimum wage (docs/RULES.md, Pay). */
export function jobOfferProblem(input: JobOfferInput): JobOfferProblem | null {
  if (input.message.trim().length > RULES.jobMessageMaxChars) return "message";
  if (input.kind === "talk") return null;
  const role = input.role.trim();
  if (role.length < 2 || role.length > RULES.jobRoleMaxChars) return "role";
  if (!Number.isInteger(input.daysPerWeek) || input.daysPerWeek < 1 || input.daysPerWeek > RULES.jobDaysPerWeekMax) return "days";
  if (!Number.isInteger(input.rateCentsPerHour) || input.rateCentsPerHour < RULES.minimumWageCentsPerHour) return "below_minimum_wage";
  return null;
}

/** The details to store: none for an invitation to talk. */
export const jobDetails = (input: JobOfferInput): JobDetails | null =>
  input.kind === "offer" ? { role: input.role.trim(), daysPerWeek: input.daysPerWeek, rateCentsPerHour: input.rateCentsPerHour } : null;

export type HireAnswerDecision = { kind: "answer" } | { kind: "unchanged" } | { kind: "refuse"; problem: "not_found" | "already_answered" };

/** Only the young person it was made to may answer, once. The same answer twice changes nothing. */
export function decideHireAnswer(uid: string, offer: HireOfferRecord | null, answer: HireAnswer): HireAnswerDecision {
  if (!offer || offer.workerId !== uid) return { kind: "refuse", problem: "not_found" };
  if (offer.answer === answer) return { kind: "unchanged" };
  return offer.answer ? { kind: "refuse", problem: "already_answered" } : { kind: "answer" };
}

export type HireOutcomeDecision = { kind: "mark" } | { kind: "unchanged" } | { kind: "refuse"; problem: "not_found" | "already_marked" };

/** Only the owner who made the offer marks how it ended, once. */
export function decideHireOutcome(uid: string, offer: HireOfferRecord | null, outcome: HireOutcome): HireOutcomeDecision {
  if (!offer || offer.ownerId !== uid) return { kind: "refuse", problem: "not_found" };
  if (offer.outcome === outcome) return { kind: "unchanged" };
  return offer.outcome ? { kind: "refuse", problem: "already_marked" } : { kind: "mark" };
}

/** On the work record and the shared record: an offer made, and a hire if the owner marked one. */
export const recordJobs = (offers: readonly Pick<HireOfferRecord, "businessName" | "outcome">[]): { businessName: string; hired: boolean }[] =>
  offers.map((offer) => ({ businessName: offer.businessName, hired: offer.outcome === "hired" }));
