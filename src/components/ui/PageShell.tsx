import Link from "next/link";
import type { ReactNode } from "react";

/** Every screen: the wordmark header on paper, then the screen's bands inside main. */
export function PageShell({ children }: { children: ReactNode }) {
  return (
    <>
      <header className="bg-paper px-5 pt-5">
        <div className="mx-auto max-w-md">
          <Link href="/" className="inline-flex min-h-11 items-center text-lg font-bold">
            First Shift
          </Link>
        </div>
      </header>
      <main>{children}</main>
    </>
  );
}
