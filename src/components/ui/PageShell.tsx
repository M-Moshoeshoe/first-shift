import Link from "next/link";
import type { ReactNode } from "react";

const FOOTER_LINKS = [
  { href: "/safety", label: "Safety and fair play" },
  { href: "/privacy", label: "Privacy" },
  { href: "/terms", label: "Terms" },
  { href: "/contact", label: "Contact" },
] as const;

/**
 * Marketing pages, and the 404 and error pages: the wordmark header on paper,
 * then the screen's bands inside main. No auth code, so these pages stay light.
 * Account screens use AppShell instead.
 */
export function PageShell({ children }: { children: ReactNode }) {
  return (
    <>
      <header className="bg-paper px-5 pt-5">
        <div className="mx-auto flex max-w-md flex-wrap items-center justify-between gap-x-4 lg:max-w-6xl">
          <Link href="/" className="inline-flex min-h-11 items-center text-lg font-bold">
            First Shift
          </Link>
          {/* Plain links for now; the UI sprint styles them. */}
          <nav aria-label="Account" className="flex gap-4">
            <Link href="/sign-in" className="inline-flex min-h-11 items-center underline">
              Sign in
            </Link>
            <Link href="/sign-in#demo" className="inline-flex min-h-11 items-center underline">
              Try the demo
            </Link>
          </nav>
        </div>
      </header>
      <main>{children}</main>
      {/* Plain links for now; the UI sprint styles the footer. */}
      <footer className="border-t-2 border-ink bg-paper px-5 py-6">
        <nav aria-label="About First Shift" className="mx-auto flex max-w-md flex-wrap gap-x-6 lg:max-w-6xl">
          {FOOTER_LINKS.map(({ href, label }) => (
            <Link key={href} href={href} className="inline-flex min-h-11 items-center underline">
              {label}
            </Link>
          ))}
        </nav>
      </footer>
    </>
  );
}
