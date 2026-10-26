import { SUPPORT_EMAIL } from "@/config/contact";
import { RULES } from "@/config/rules";
import { formatRand } from "./money";
import type { PostingProblem, TermsProblem } from "./tryoutDecisions";

/*
 * Every sentence an owner sees when a tryout can't be drafted, posted or
 * withdrawn: what went wrong and what to do. Numbers come from RULES; "Contact us"
 * becomes a support link (messages.ts, splitContactLink). Copy rules: AGENTS.md.
 */

const clock = (hour: number): string => `${String(hour).padStart(2, "0")}:00`;
const hoursRange = `${RULES.minPaidHours} to ${RULES.maxTryoutHours} hours`;

export const POSTING_PROBLEM_MESSAGES: Record<PostingProblem, string> = {
  not_business: "Only a business account can post tryouts. Sign in with the Google account you used for your business.",
  profile_incomplete: "Finish your business profile first: your details, your premises pin and a photo of your shopfront.",
  owner_missing: "Add your details as the owner first: your full name, your ID number, a photo of your face and your cellphone number.",
  account_paused: `Your account is paused, so you can't post tryouts right now. Contact us to sort it out.`,
  no_credits: `You've used your free tryouts. Top-ups open soon. Contact us at ${SUPPORT_EMAIL} if you need more now.`,
};

export const TERMS_MESSAGES: Record<TermsProblem, string> = {
  invalid_date: "Choose the date of the tryout.",
  invalid_time: "Choose the time the tryout starts.",
  invalid_hours: `Choose how long the tryout is, from ${hoursRange}.`,
  ends_before_start: `Choose how long the tryout is, from ${hoursRange}.`,
  too_soon: `A tryout must start at least ${RULES.minNoticeMinutes / 60} hours from now, so someone can see it and get there. Choose a later time.`,
  outside_daylight: `Tryouts run in daylight, between ${clock(RULES.daylightStartHour)} and ${clock(RULES.daylightEndHour)}. Choose a time that starts and ends in that window.`,
  spans_days: "A tryout must start and end on the same day. Choose an earlier start or fewer hours.",
  too_short: `A tryout is at least ${RULES.minPaidHours} hours. Choose ${hoursRange}.`,
  too_long: `A tryout is at most ${RULES.maxTryoutHours} hours. Choose ${hoursRange}.`,
  below_minimum_wage: `The rate must be at least ${formatRand(RULES.minimumWageCentsPerHour)} an hour, the national minimum wage. Raise the rate.`,
};

export const TRYOUT_MESSAGES = {
  postsLimit: `You can post up to ${RULES.postsPerDay} tryouts a day. Post this one tomorrow.`,
  aiLimit: "You've used today's drafting help. Try again tomorrow.",
  // When the AI doesn't answer: drafting says so, and posting (which only checks the work) says that instead.
  aiDraftUnavailable: "We couldn't draft that right now. Try again in a minute.",
  aiCheckUnavailable: "We couldn't check your tryout right now. Try again in a minute.",
  notFound: "We can't find that tryout. It may have been withdrawn already. Go back to your tryouts and check.",
  booked: `Someone is booked on this tryout, so it can't be withdrawn. Contact us if you need to cancel.`,
  finished: "This tryout has already happened, so it can't be withdrawn.",
  asksForMoney: "A tryout never costs the young person anything. Take out anything that asks them to pay, such as a fee, a deposit or their own uniform, then try again.",
} as const;

/** Booking (Phase 4). Approved copy; a question, because the answer is the owner's choice. */
export const BOOKING_MESSAGES = {
  regularEmployment: "Another tryout would make this regular employment, which brings UIF and leave rules. Offer them a job instead?",
} as const;

/** Shape problems in what the form sends, one per field (schemas/tryout.ts). */
export const TRYOUT_FIELD_MESSAGES = {
  description: "Describe the work in one sentence, like \"Help sorting stock and serving customers on Saturday\".",
  title: "Give the tryout a short title, 3 to 60 characters.",
  tasks: "List 1 to 6 tasks, each 3 to 120 characters.",
  rate: "Enter the hourly rate in rand.",
  supervision: "Confirm you'll be on site to supervise.",
} as const;

/** The first problem is the one the owner sees from the server; the form shows each next to its field. */
export const termsMessage = (problems: readonly TermsProblem[]): string => TERMS_MESSAGES[problems[0] ?? "invalid_hours"];
