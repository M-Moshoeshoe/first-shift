import Link from "next/link";
import type { ReactNode } from "react";
import { BrandLogo } from "../BrandLogo";

/**
 * The 404, the error page, and the private status and shared record links:
 * the logo and the content, no menu. The error
 * page loads with every page as the root error boundary, so it must carry no
 * header code of its own (docs/DESIGN.md, Performance). The footer, server
 * rendered, is passed in only where it costs no JavaScript.
 */
export function SimpleShell({ children, footer }: { children: ReactNode; footer?: ReactNode }) {
  return (
    <>
      <header className="border-b border-line bg-paper px-5">
        <div className="mx-auto flex max-w-md items-center py-2 lg:max-w-6xl">
          <Link href="/" aria-label="First Shift, home" className="inline-flex min-h-11 items-center">
            <BrandLogo height={28} />
          </Link>
        </div>
      </header>
      <main>{children}</main>
      {footer}
    </>
  );
}
