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
  notYet: "Your reference isn't written yet. Tap Write my reference.",
  notYetWaiting: "Your reference is not written yet. It is written once you tap Received.",
  aiFailed: "We could not write your reference just now. Wait a minute, then tap Write my reference.",
  loadFailed: "Your reference did not load. Check your connection, then reload the page.",
  writeFailed: "Your reference was not written. Check your connection, then tap Write my reference.",
  decideFailed: "That did not go through. Check your connection, then tap the button again.",
  ownerNote: "The young person reviews the reference written from your answers. You can't change it once it's written.",
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
  publicMissing: "This link isn't working. Ask the person who sent it for a new one.",
  unavailable: "Your record didn't load. Check your connection, then tap Try again.",
  metaTitle: "A work record on First Shift",
  metaDescription: "Paid tryouts, each confirmed by the business and the young person, with references they approved.",
} as const;

export const HIRE_COPY = {
  offer: (name: string) => `Offer ${name} a job`,
  why: (name: string) => `You and ${name} have worked together enough that a job is the next step. Tryouts aren't meant for regular work.`,
  offered: (name: string) => `Your job offer to ${name} is recorded. Send it on WhatsApp and talk about the details.`,
  send: "Send the offer on WhatsApp",
  message: (name: string, owner: string, business: string) => `Hi ${name}, it's ${owner} from ${business}. You've done great work on your tryouts. We'd like to offer you a job. When can we talk about it?`,
  received: (business: string) => `Job offer from ${business}`,
  receivedHint: "The business will contact you on WhatsApp about it.",
} as const;
