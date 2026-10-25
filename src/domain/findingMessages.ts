import { RULES } from "@/config/rules";
import type { ClosedReason, NotEligibleReason } from "./applications";
import { BUTTON_LABELS } from "./buttonLabels";
import { formatRand } from "./money";

/*
 * Every sentence a young person sees while finding and applying for a
 * tryout. Numbers come from RULES; "Contact us" becomes a support link
 * (messages.ts, splitContactLink). Copy rules: AGENTS.md.
 */

const clock = (hour: number): string => `${String(hour).padStart(2, "0")}:00`;

export const FEED_COPY = {
  title: "Paid tryouts near you",
  intro: (area: string) => `Within ${RULES.nearbyRadiusKm} km of ${area}.`,
  explainerTitle: "What's a tryout?",
  explainer: `One paid day at a business near you. You're paid the same day, at least ${formatRand(RULES.minimumWageCentsPerHour)} an hour, and the business writes you a reference.`,
  explainerDismiss: "Got it",
  emptyTitle: "No tryouts near you right now",
  empty: (area: string) => `Nothing within ${RULES.nearbyRadiusKm} km of ${area} is open for applications. Tap ${BUTTON_LABELS.refresh} to check again later.`,
  fareUnknown: "Fare not known",
  newBusiness: "New on First Shift",
} as const;

export const DETAIL_COPY = {
  tasks: "What you'll do",
  when: "When",
  pay: "Pay",
  payLine: (rateCents: number, hours: number, payCents: number) => `${formatRand(rateCents)} an hour for ${hours} hours: ${formatRand(payCents)}`,
  returnFare: (cents: number) => `Return taxi fare: about ${formatRand(cents)}`,
  keep: (cents: number) => `You keep about ${formatRand(cents)} after the taxi fare.`,
  safety: "Safe by design",
  safetyLines: [
    `Daylight only, between ${clock(RULES.daylightStartHour)} and ${clock(RULES.daylightEndHour)}.`,
    "At the business itself, never at someone's home.",
    "The owner checks your ID at the door.",
  ],
  address: "Exact address after booking.",
  noteLabel: "A note for the business (optional)",
  noteHint: `Up to ${RULES.applicationNoteMaxChars} characters, like when you can get there.`,
  appliedTitle: "You've applied",
  applied: (business: string) => `${business} can see your application now. If they book you, you'll see it here.`,
  withdrawn: "Your application is withdrawn. You can apply again while applications are open.",
  back: "Back to tryouts",
  unavailableTitle: "Tryout not available",
} as const;

export const NOT_ELIGIBLE_MESSAGES: Record<NotEligibleReason, string> = {
  not_young_person: "Only someone looking for work can apply for tryouts. Sign in with the Google account you use to find work.",
  profile_incomplete: "Finish your profile first: your details, your ID number and a photo of your face.",
  account_paused: "Your account is paused, so you can't apply for tryouts right now. Contact us to sort it out.",
  overlaps_booking: "You're booked on another tryout at this time, so you can't apply for this one. Pick a tryout on another day.",
};

export const CLOSED_MESSAGES: Record<ClosedReason, string> = {
  booking_closed: `Applications for this tryout have closed. They close ${RULES.bookingCutoffMinutes / 60} hour before the start, so whoever is booked can get there.`,
  not_open: "This tryout isn't taking applications any more. Go back and pick another one.",
};

export const FINDING_MESSAGES = {
  notFound: "We can't find that tryout. It may have been taken down. Go back to your tryouts and pick another one.",
  applicationNotFound: "We can't find that application. It may have been withdrawn already. Go back to your tryouts and check.",
  applyLimit: `You can apply for up to ${RULES.applicationsPerDay} tryouts a day. Apply for this one tomorrow.`,
  unknownArea: (area: string) => `We don't know where ${area} is yet, so we can't find tryouts near you. Contact us and we'll add it.`,
  feedUnavailable: `Tryouts didn't load. Check your connection, then tap ${BUTTON_LABELS.refresh}.`,
  detailUnavailable: `This tryout didn't load. Check your connection, then tap ${BUTTON_LABELS.tryAgain}.`,
  note: `Your note can be up to ${RULES.applicationNoteMaxChars} characters. Make it shorter.`,
} as const;
