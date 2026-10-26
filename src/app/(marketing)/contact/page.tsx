import type { Metadata } from "next";
import Link from "next/link";
import { Flag, Mail, ShieldCheck, type LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { SUPPORT_EMAIL } from "@/config/contact";
import { PlainPage } from "../_components/PlainPage";

export const metadata: Metadata = { title: "Contact First Shift", description: "How to reach the First Shift team." };

const CARDS: readonly { icon: LucideIcon; heading: string; body: string; action?: ReactNode }[] = [
  {
    icon: Mail,
    heading: "Email us",
    body: "For anything else, including your personal information and deleting your account.",
    action: <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>,
  },
  {
    icon: Flag,
    heading: "Report a problem with a tryout",
    body: "Open the booking and tap Report a problem. It reaches the First Shift team with the booking attached, so we can help faster.",
  },
  {
    icon: ShieldCheck,
    heading: "In an emergency",
    body: "Call the police on 10111, or 112 from a cellphone. Get safe first, then report it on the booking.",
    action: <Link href="/safety">Read safety and fair play</Link>,
  },
];

/** Contact: three cards, the support email, where a report about a tryout belongs, and what to do in an emergency. */
export default function ContactPage() {
  return (
    <PlainPage title="Contact us" intro="Email the First Shift team, or report a problem on the booking it is about." sections={[]}>
      <ul className="flex flex-col gap-4">
        {CARDS.map(({ icon: Icon, heading, body, action }) => (
          <li key={heading} className="flex flex-col gap-3 border border-line p-4">
            <h2 className="flex items-center gap-3 text-xl font-bold">
              <Icon aria-hidden="true" size={24} strokeWidth={1.75} className="shrink-0" />
              {heading}
            </h2>
            <p className="text-base">{body}</p>
            {action ? <span className="inline-flex min-h-11 items-center font-semibold [&>a]:underline [&>a]:underline-offset-4">{action}</span> : null}
          </li>
        ))}
      </ul>
    </PlainPage>
  );
}
