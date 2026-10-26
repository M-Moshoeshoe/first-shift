"use client";

import { Flag, LifeBuoy, Mail, MessageSquare, ShieldCheck, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { useRef } from "react";
import { Sheet } from "./ui/Sheet";

const LINKS: readonly { href: string; icon: LucideIcon; label: string; line: string }[] = [
  { href: "/#faq", icon: MessageSquare, label: "Questions", line: "What people ask about tryouts, pay and costs." },
  { href: "/contact", icon: Flag, label: "Report a problem", line: "About a tryout: open the booking and tap Report a problem." },
  { href: "/safety", icon: ShieldCheck, label: "Safety and fair play", line: "How tryouts are kept safe, and what to do in an emergency." },
  { href: "/contact", icon: Mail, label: "Contact", line: "Email the First Shift team." },
];

/**
 * A Help button on every app screen, above the tab bar, opening a sheet of
 * four ways to get help, in a native-dialog Sheet. No chatbot.
 */
/** aboveNav: lifted clear of the phone tab bar. */
export function HelpButton({ aboveNav }: { aboveNav: boolean }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const close = () => dialog.current?.close();
  return (
    <>
      <button
        type="button"
        aria-haspopup="dialog"
        onClick={() => dialog.current?.showModal()}
        className={`fixed right-4 ${aboveNav ? "bottom-20" : "bottom-4"} z-10 inline-flex min-h-11 items-center gap-2 border border-ink bg-paper px-3 text-sm font-semibold active:scale-97 lg:bottom-6`}
      >
        <LifeBuoy aria-hidden="true" size={20} strokeWidth={1.75} />
        Help
      </button>
      <Sheet sheetRef={dialog} title="Help">
        <ul className="flex flex-col gap-2">
          {LINKS.map(({ href, icon: Icon, label, line }) => (
            <li key={label}>
              <Link href={href} onClick={close} className="flex min-h-11 items-start gap-3 border border-line p-3">
                <Icon aria-hidden="true" size={20} strokeWidth={1.75} className="mt-0.5 shrink-0" />
                <span className="flex flex-col">
                  <span className="text-base font-semibold">{label}</span>
                  <span className="text-sm text-muted">{line}</span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </Sheet>
    </>
  );
}
