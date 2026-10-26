import type { Metadata } from "next";
import { SUPPORT_EMAIL } from "@/config/contact";
import { PlainPage, type PlainSection } from "../_components/PlainPage";

export const metadata: Metadata = { title: "Privacy notice for First Shift", description: "What First Shift collects, why, who sees it, how long we keep it, and how to ask us to delete it." };

// Kept in step with SECURITY.md (Privacy, POPIA). Change both together.
const SECTIONS: readonly PlainSection[] = [
  {
    heading: "Who we are",
    body: [`First Shift connects young people with paid one-day tryouts at small businesses. We are responsible for the personal information described here. Ask us anything about it at ${SUPPORT_EMAIL}.`],
  },
  {
    heading: "What we collect, and why",
    body: [
      "From everyone: the Google account you sign in with, so you can sign in again.",
      "From a young person looking for work:",
      [
        "Your first name, area and a face photo, so a business can see who applied",
        "Your legal surname, kept private, so we can find the person behind an account if something goes wrong",
        "Your cellphone number for payments and the ways you can be paid, so a business can pay you",
        "What you can do, the languages you speak and a one-line introduction, so a business can choose. Phone numbers, emails and links are taken out of the introduction",
        "Your ID number, to check you are 18 or older and have one account. We keep only a scrambled code that cannot be turned back into your number, and the last four digits",
      ],
      "From a business owner:",
      ["The business name, area, opening hours, its exact location and a shopfront photo", "Whether you are registered with the Compensation Fund (COIDA)", "Your full name, ID number (kept the same way), a face photo taken live, a contact number, and a CIPC number if you give one"],
      "From using First Shift: applications, bookings, check-in and check-out times, the payment the business recorded and whether you confirmed it, references, reports, and screenshots added in a payment dispute.",
    ],
  },
  {
    heading: "What we never collect",
    body: [["Bank account numbers", "Your face for matching: we do not run face matching", "Advertising trackers: we do not use any, and we do not sell personal information"]],
  },
  {
    heading: "Who sees what",
    body: [
      [
        "When you apply, the business sees your first name, photo, introduction, what you can do and your languages. Never your surname, ID number or phone number",
        "Once booked, the business sees your number for payments, and at the door the last four digits of your ID. You see the owner's first name, photo and number, and the exact location",
        "Your shared work record shows your first name and your paid tryouts with the references you approved. Never your surname, ID or number",
        "A Share my trip link shows first names, the business, the times and the status, until midnight after the tryout",
        "The First Shift team keeps full names, phone numbers and the last four ID digits so we can find the person behind an account when a safety report, a payment dispute or a strike needs it",
      ],
    ],
  },
  {
    heading: "AI",
    body: ["Claude, an AI model made by Anthropic, drafts a tryout from what the owner typed, checks that the work is allowed, and writes a reference from the owner's three answers and the tasks. No name, ID number or phone number is sent to it."],
  },
  {
    heading: "Where it is kept, and for how long",
    body: [
      "Your information is stored with Google Firebase and the site runs on Netlify. Your own records can be read only by you, by our server, and by the First Shift team when they look into a report.",
      "We keep your information while your account is open, so your work record and references stay yours. A dispute screenshot is kept for the review it belongs to.",
    ],
  },
  {
    heading: "Your rights",
    body: [
      `You can ask to see, correct or delete your information by emailing ${SUPPORT_EMAIL}. Deleting an account is not in the app yet: email us and we complete it within 30 days.`,
      "If you are unhappy with how we handle your information, you can complain to the Information Regulator.",
    ],
  },
];

/** The privacy notice (POPIA): plain text, public, linked from every public page's footer and from sign-in. */
export default function PrivacyPage() {
  return <PlainPage title="Privacy notice" intro="What we collect, why, who sees it, and how to ask us to change or delete it." sections={SECTIONS} />;
}
