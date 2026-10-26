import type { Metadata } from "next";
import { SUPPORT_EMAIL } from "@/config/contact";
import { RULES } from "@/config/rules";
import { TERMS_VERSION } from "@/config/terms";
import { formatRand } from "@/domain/money";
import { PlainPage, type PlainSection } from "../_components/PlainPage";

export const metadata: Metadata = { title: "Terms of use for First Shift", description: "What First Shift is and is not, what it costs, how everyone is expected to behave, and when an account is paused." };

const MINIMUM = formatRand(RULES.minimumWageCentsPerHour);
const CREDIT = formatRand(RULES.creditPriceCents);

// Plain words, kept in step with docs/RULES.md, docs/MONEY.md and docs/COMPLIANCE.md. Changing them means a new TERMS_VERSION.
const SECTIONS: readonly PlainSection[] = [
  {
    heading: "What First Shift is",
    body: [
      "First Shift connects young people with paid one-day tryouts at businesses near them, and records what happened: the booking, check-in and check-out, the payment and the reference.",
      "First Shift is not the employer. On the tryout day, the business is the young person's employer, with every duty that brings. First Shift is not a labour broker and never holds or moves wages: the business pays the young person directly.",
    ],
  },
  {
    heading: "Who can use it",
    body: [["People 18 or older with a South African ID number", "One account per ID number", "Each account is either looking for work or running a business, chosen once"]],
  },
  {
    heading: "What it costs",
    body: [
      `Free for young people. A business pays ${CREDIT} for each completed tryout, with its first ${RULES.freeCredits} free.`,
      "A credit is used only when the young person is owed money, and comes back when nothing is owed. Credits do not expire. Paying for credits online is not open yet; when it opens, unused paid credits can be refunded on request, less the payment provider's fee.",
    ],
  },
  {
    heading: "What businesses agree to",
    body: [
      [
        `Pay at least ${MINIMUM} an hour, the national minimum wage, for every hour, and at least ${RULES.minPaidHours} hours`,
        "Pay at check-out, directly, by one of the ways the young person chose, and mark it paid the same day",
        "Be on site, keep the work safe and in daylight, and post only work that is allowed",
        "Check the young person's face and ID card at the door",
        "Never ask a young person for money, and never ask for money back",
      ],
    ],
  },
  {
    heading: "What young people agree to",
    body: [["Give true details", "Turn up, or cancel in time", "Check the real balance before tapping Received, and tell the truth about being paid"]],
  },
  {
    heading: "How everyone behaves",
    body: ["No harassment, no threats, no scams and no unfair treatment of anyone. Report anything that goes wrong on the booking. Someone from the First Shift team looks into every report."],
  },
  {
    heading: "Strikes, pauses and suspension",
    body: [
      "A strike is a no-show, a late cancellation, a false payment claim, or a safety report that is upheld. Strikes stop counting after 90 days and can be overturned when they are looked into.",
      "A business is paused while a tryout is unpaid, or while a report of harassment, unsafe work or a request for money is looked into. A paused business cannot post or book. The First Shift team can pause or suspend any account that breaks these terms.",
    ],
  },
  {
    heading: "References",
    body: ["A reference is written with AI from the owner's three answers and the tasks, and nothing else. The young person sees it first, and adds it to their record or challenges it. An owner cannot change a reference once it is written."],
  },
  {
    heading: "These terms",
    body: [`Version ${TERMS_VERSION}. They are in plain language, and a labour lawyer will review them before the pilot. If they change, we will ask you to agree again. Questions: ${SUPPORT_EMAIL}.`],
  },
];

/** The terms of use: plain text, public, agreed to at sign-in. */
export default function TermsPage() {
  return <PlainPage title="Terms of use" intro="What First Shift is and is not, what it costs, and what everyone agrees to." sections={SECTIONS} />;
}
