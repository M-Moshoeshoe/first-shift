"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { NavItem } from "@/config/nav";
import { useAuth } from "@/lib/auth/useAuth";
import { BrandLogo } from "./BrandLogo";
import { NavIcon } from "./NavIcon";
import { NavLabel } from "./NavLabel";
import { SignOutButton } from "./SignOutButton";

/**
 * Every account screen: the logo on the left and Sign out whenever someone is
 * signed in, including during onboarding, so nobody is stuck on the wrong
 * account. From 1024 px, the role's links sit in a row underneath (phones use
 * the bottom bar). Both rows share the app column's width, so the logo lines
 * up with the content below it.
 */
export function AppHeader({ nav, badge }: { nav: readonly NavItem[]; badge: number }) {
  const { user } = useAuth();
  const pathname = usePathname();
  return (
    <header className="border-b border-line bg-paper px-5">
      <div className="mx-auto flex max-w-md items-center justify-between gap-4 py-2 lg:px-5">
        <Link href="/" aria-label="First Shift, home" className="inline-flex min-h-11 items-center">
          <BrandLogo height={24} />
        </Link>
        {user ? <SignOutButton variant="header" /> : null}
      </div>
      {nav.length > 0 ? (
        <nav aria-label="Main" className="mx-auto hidden max-w-md lg:block lg:px-5">
          <ul className="flex gap-6">
            {nav.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  aria-current={pathname === item.href ? "page" : undefined}
                  className="-mb-px flex min-h-11 items-center gap-1.5 border-b-2 border-transparent text-[13.5px] font-semibold text-muted aria-[current=page]:border-ink aria-[current=page]:text-ink"
                >
                  <NavIcon href={item.href} />
                  <NavLabel item={item} count={badge} />
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      ) : null}
    </header>
  );
}
