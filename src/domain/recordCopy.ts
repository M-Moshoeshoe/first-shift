import { RULES } from "@/config/rules";
import { formatRand } from "./money";
import type { OwnerAnswers } from "./references";

/*
 * Phase 6's words: the owner's three questions at check-out, the reference
 * the young person reviews, the work record and its share link, and the job
 * offer. Copy rules: AGENTS.md.
 */

/** The three questions, the same for every reference: the fixed criteria the young person sees. */
export const ANSWER_QUESTIONS: Record<keyof OwnerAnswers, string> = {
  onTime: "On time?",
  didTheWork: "Did the work as asked?",
  wouldHireAgain: "Would you hire them again?",
};

export const ANSWER_ORDER = ["onTime", "didTheWork", "wouldHireAgain"] as const satisfies readonly (keyof OwnerAnswers)[];

export const yesNo = (value: boolean): string => (value ? "Yes" : "No");

export const REFERENCE_COPY = {
  answersTitle: "Your answers",
  answersHint: "Your reference is written from these three answers and the tasks, nothing else.",
  answersNeeded: "Answer the three questions about the day.",
  title: "Your reference",
  criteria: "What the business said",
  writtenWithAi: "Written with AI from the business's answers.",
  example: "Example reference for the demo.",
  add: "Add to my record",
  added: "Added to your record.",
  challenge: "Challenge it",
  challengeReason: "What's wrong with it?",
  challengeHint: "A person at First Shift reads this and contacts you. Until then the reference stays off your record.",
  challengeSend: "Send my challenge",
  challengeNeeded: "Say what's wrong with it, so we can look into it.",
  challenged: "We're looking into your challenge. The reference stays off your record until it's sorted out.",
  rejectedNote: "We looked into your challenge and the reference stands. You can add it to your record, or leave it off.",
  withdrawn: "We looked into your challenge and took this reference off.",
  write: "Write my reference",
  writing: "Writing your reference",
  notYet: "Your reference is not written yet. Tap Write my reference.",
  notYetWaiting: "Your reference is not written yet. It is written once you tap Received.",
  aiFailed: "We could not write your reference just now. Wait a minute, then tap Write my reference.",
  loadFailed: "Your reference did not load. Check your connection, then reload the page.",
  writeFailed: "Your reference was not written. Check your connection, then tap Write my reference.",
  decideFailed: "That did not go through. Check your connection, then tap the button again.",
  ownerNote: "The young person reviews the reference written from your answers. You cannot change it once it's written.",
} as const;

export const RECORD_COPY = {
  title: "Your work record",
  intro: "Every tryout you were paid for, confirmed by you and the business.",
  empty: "Your first paid tryout will show here once you tap Received.",
  verified: "Paid, confirmed by both",
  hours: (hours: number) => `${hours} ${hours === 1 ? "hour" : "hours"}`,
  share: "Share my record",
  shareOnWhatsApp: "Share on WhatsApp",
  draftWaiting: "Your reference is waiting on the booking: add it to your record or challenge it.",
  challengeOpen: "We're looking into your challenge. The reference stays off your record until it's sorted out.",
  shareHint: "Anyone with this link sees your first name, your tryouts and the references you added. Never your ID or number.",
  shareText: (link: string) => `My work record on First Shift, with references from the businesses I worked for: ${link}`,
  publicTitle: (name: string) => `${name}'s work record`,
  publicIntro: "Paid tryouts on First Shift, each confirmed by the business and the young person. References show only once the young person approved them.",
  publicMissing: "This link is not working. Ask the person who sent it for a new one.",
  unavailable: "Your record did not load. Check your connection, then tap Try again.",
  metaTitle: "A work record on First Shift",
  metaDescription: "Paid tryouts, each confirmed by the business and the young person, with references they approved.",
} as const;

export const HIRE_COPY = {
  offer: (name: string) => `Offer ${name} a job`,
  why: (name: string) => `You and ${name} have worked together enough that a job is the next step. Tryouts are not meant for regular work.`,
  kindLabel: "How do you want to start?",
  talk: "Invite to talk about a job",
  offerJob: "Offer a job",
  role: "The job",
  roleHint: "A few words, like shop assistant.",
  days: "Days a week",
  rate: "Pay per hour",
  rateHint: `At least ${formatRand(RULES.minimumWageCentsPerHour)}, the national minimum wage.`,
  messageLabel: "A message from you (optional)",
  eti: "Hiring someone aged 18 to 29? You may qualify for the Employment Tax Incentive. Check with SARS or your accountant.",
  record: "Record it",
  recording: "Recording it",
  problems: {
    role: `Say what the job is, in up to ${RULES.jobRoleMaxChars} characters.`,
    days: `Choose 1 to ${RULES.jobDaysPerWeekMax} days a week.`,
    below_minimum_wage: `The pay must be at least ${formatRand(RULES.minimumWageCentsPerHour)} an hour, the national minimum wage.`,
    message: `Keep your message to ${RULES.jobMessageMaxChars} characters.`,
  },
  offered: (name: string) => `Recorded. Send it to ${name} on WhatsApp, where you can change the words first.`,
  send: "Send it on WhatsApp",
  summary: (details: { role: string; daysPerWeek: number; rateCentsPerHour: number }) => `${details.role}, ${details.daysPerWeek} ${details.daysPerWeek === 1 ? "day" : "days"} a week, ${formatRand(details.rateCentsPerHour)} an hour.`,
  talkSummary: "An invitation to talk about a job.",
  waiting: (name: string) => `Waiting for ${name} to answer.`,
  interested: (name: string) => `${name} is interested.`,
  notNow: (name: string) => `${name} said not right now. You can keep doing tryouts together, up to the 24-hour line each month.`,
  outcomeTitle: "How did it go?",
  hired: "Hired",
  didNotWorkOut: "Did not work out",
  markedHired: (name: string) => `Marked: you hired ${name}.`,
  markedNotWorkedOut: "Marked: it did not work out.",
  whatsapp: (name: string, owner: string, business: string, details: { role: string; daysPerWeek: number; rateCentsPerHour: number } | null, note: string) =>
    [
      `Hi ${name}, it's ${owner} from ${business}. You've done great work on your tryouts.`,
      details
        ? `We would like to offer you a job: ${details.role}, ${details.daysPerWeek} ${details.daysPerWeek === 1 ? "day" : "days"} a week at ${formatRand(details.rateCentsPerHour)} an hour.`
        : "We would like to talk to you about a job here.",
      note.trim(),
      "When can we talk?",
    ]
      .filter(Boolean)
      .join(" "),
  received: (business: string) => `Job offer from ${business}`,
  receivedTalk: (business: string) => `${business} would like to talk to you about a job`,
  answerInterested: "I'm interested",
  answerNotNow: "Not right now",
  answering: "Sending your answer",
  youInterested: (owner: string) => `You said you're interested. Message ${owner} on WhatsApp to talk about it.`,
  youNotNow: "You said not right now. Nothing else changes: you can keep doing tryouts, here and anywhere else.",
  messageOwner: (owner: string) => `Message ${owner} on WhatsApp`,
  interestedText: (owner: string, business: string) => `Hi ${owner}, I'm interested in the job at ${business}. When can we talk?`,
  answerFailed: "Your answer did not send. Check your connection, then tap it again.",
  offeredBy: (business: string) => `Offered a job by ${business}`,
  hiredBy: (business: string) => `Hired by ${business}`,
} as const;
