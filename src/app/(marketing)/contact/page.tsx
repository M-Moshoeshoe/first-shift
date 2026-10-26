import type { Metadata } from "next";
import { SUPPORT_EMAIL } from "@/config/contact";
import { PlainPage, type PlainSection } from "../_components/PlainPage";

export const metadata: Metadata = { title: "Contact First Shift", description: "How to reach the First Shift team." };

const SECTIONS: readonly PlainSection[] = [
  {
    heading: "About a tryout",
    body: ["Open the booking and tap Report a problem. It reaches the First Shift team with the booking attached, so we can help faster."],
  },
  {
    heading: "In an emergency",
    body: ["Call the police on 10111, or 112 from a cellphone. Get safe first, then report it on the booking."],
  },
];

/** Contact: the support email, and where a report about a tryout belongs. */
export default function ContactPage() {
  return (
    <PlainPage title="Contact us" intro="For anything else, including your personal information and deleting your account, email us." sections={SECTIONS}>
      <a href={`mailto:${SUPPORT_EMAIL}`} className="inline-flex min-h-11 items-center self-start text-base font-semibold underline underline-offset-4">
        {SUPPORT_EMAIL}
      </a>
    </PlainPage>
  );
}
