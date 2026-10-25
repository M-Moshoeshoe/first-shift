"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { NavItem } from "@/config/nav";
import { useAuth } from "@/lib/auth/useAuth";
import { NavLabel } from "./NavLabel";
import { SignOutButton } from "./SignOutButton";

/**
 * Every account screen: the wordmark on the left; on the right, the role's
 * links (desktop only; phones use the bottom bar) and Sign out whenever
 * someone is signed in, including during onboarding, so nobody is stuck on
 * the wrong account.
 */
export function AppHeader({ nav, badge }: { nav: readonly NavItem[]; badge: number }) {
  const { user } = useAuth();
  const pathname = usePathname();
  return (
    <header className="bg-paper px-5 pt-5 lg:border-b-2 lg:border-ink lg:py-2">
      <div className="mx-auto flex max-w-md items-start justify-between gap-4 lg:max-w-6xl lg:items-center">
        <Link href="/" className="inline-flex min-h-11 items-center text-lg font-bold">
          First Shift
        </Link>
        <div className="flex items-center gap-6">
          {nav.length > 0 ? (
            <nav aria-label="Main" className="hidden lg:block">
              <ul className="flex gap-6">
                {nav.map((item) => (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      aria-current={pathname === item.href ? "page" : undefined}
                      className="inline-flex min-h-11 items-center font-bold text-muted aria-[current=page]:text-ink aria-[current=page]:underline aria-[current=page]:underline-offset-4"
                    >
                      <NavLabel item={item} count={badge} />
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          ) : null}
          {user ? <SignOutButton variant="header" /> : null}
        </div>
      </div>
    </header>
  );
}
