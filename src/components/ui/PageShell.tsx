import Link from "next/link";
import type { ReactNode } from "react";

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
    </>
  );
}
