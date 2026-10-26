import { RULES } from "@/config/rules";
import { formatRand } from "@/domain/money";

/*
 * The home page's words, from docs/RULES.md, docs/MONEY.md and /safety. A
 * number here comes from RULES, so the page can't drift from the product.
 */
const MINIMUM = formatRand(RULES.minimumWageCentsPerHour);
const CREDIT = formatRand(RULES.creditPriceCents);

export const HERO = {
  title: "Every job wants experience. Get yours in a day.",
  intro: "Paid one-day tryouts at small businesses near you, with a reference from the business that paid.",
  chips: [`At least ${MINIMUM} an hour`, "Paid the same day", "A real reference"],
  demo: "Judging the hackathon? Try the demo in one tap.",
} as const;

export const WHAT = {
  title: "What a tryout is",
  sentence: "One paid day of real work at a small business near you: you show what you can do, and the business sees you at work.",
  facts: [`${RULES.minPaidHours} to ${RULES.maxTryoutHours} hours, in daylight, at the business`, `At least ${MINIMUM} an hour, and at least ${RULES.minPaidHours} hours paid`, "Paid by the business directly, the same day"],
} as const;

export const HOW = {
  title: "How it works",
  young: {
    id: "for-young-people",
    title: "For young people",
    steps: [
      "Find a paid tryout near you and apply in one tap.",
      "Get booked, and share your trip with someone you trust.",
      "Do the day. The owner checks you in at the door and pays you before you go.",
      "Get a reference written from the business's answers, on a work record you can share.",
    ],
  },
  business: {
    id: "for-businesses",
    title: "For businesses",
    steps: [
      "Describe the work in one sentence. We draft the tryout and check it is safe work.",
      "See who applied, ranked by fit and by how likely they are to turn up.",
      "Check them in at the door, then pay them yourself at the end of the day.",
      "Answer three questions about the day, and offer a job when it is right.",
    ],
  },
} as const;

export const SAFETY = {
  title: "Safety and fair play",
  cards: [
    { icon: "id", title: "ID checked at the door", text: "The owner checks the young person's face and ID card, then types their check-in code." },
    { icon: "daylight", title: "Daylight only", text: "Between 07:00 and 18:00, at the business itself, with the owner on site." },
    { icon: "share", title: "Share your trip", text: "A link for someone you trust: where you are and how the day is going." },
    { icon: "report", title: "Report a problem", text: "On every booking. Harassment, unsafe work or a request for money pauses the business at once." },
  ],
  more: "How safety and fair play work",
} as const;

export const COST = {
  title: "What it costs",
  sentence: `Free for young people. Businesses pay ${CREDIT} for each completed tryout, and their first ${RULES.freeCredits} are free.`,
  numbers: [
    { value: MINIMUM, label: "an hour, at least" },
    { value: `${RULES.minPaidHours} hours`, label: "paid, at least" },
    { value: CREDIT, label: "per completed tryout, for the business" },
  ],
} as const;

export const FAQ = {
  title: "Questions",
  items: [
    { q: "What is a tryout?", a: `One paid day of real work at a small business, ${RULES.minPaidHours} to ${RULES.maxTryoutHours} hours, in daylight. It ends with a reference written from the business's answers.` },
    { q: "Who pays, and how much?", a: `The business pays the young person directly: at least ${MINIMUM} an hour, and at least ${RULES.minPaidHours} hours. Young people never pay anything. Businesses pay First Shift ${CREDIT} for each completed tryout, and their first ${RULES.freeCredits} are free.` },
    { q: "How are young people paid?", a: "By one of the ways they choose: FNB eWallet, PayShap, a cash-send from the business's bank, or cash. We never ask for a bank account number. Check your real balance before you tap Received." },
    { q: "How is it kept safe?", a: "Tryouts are in daylight, at the business, with the owner on site. The owner checks your ID at the door, you can share your trip, and unsafe work is refused before it is posted." },
    { q: "What happens if someone is not paid?", a: "Tap Not received. The business is paused at once, both sides can add a screenshot, and the First Shift team looks into it. A business that has not marked a tryout paid by 23:59 that day is paused too." },
    { q: "Can foreign nationals use First Shift?", a: "Not yet. Today we check South African ID numbers only. Refugee IDs, work permits and study visas are planned, each checked by a person." },
  ],
} as const;

export const CLOSING = {
  title: "Your first shift starts here.",
} as const;
