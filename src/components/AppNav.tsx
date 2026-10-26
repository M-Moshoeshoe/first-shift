"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { NavItem } from "@/config/nav";
import { NavLabel } from "./NavLabel";

/** Phones only: the role's destinations as a bottom tab bar, within thumb reach. Desktop shows them in the header. */
export function AppNav({ items, badge }: { items: readonly NavItem[]; badge: number }) {
  const pathname = usePathname();
  return (
    <nav aria-label="Main" className="fixed inset-x-0 bottom-0 border-t border-line bg-paper lg:hidden">
      <ul className="mx-auto flex max-w-md">
        {items.map((item) => (
          <li key={item.href} className="flex-1">
            <Link
              href={item.href}
              aria-current={pathname === item.href ? "page" : undefined}
              className="flex min-h-14 items-center justify-center font-semibold text-muted aria-[current=page]:bg-mist aria-[current=page]:text-ink"
            >
              <NavLabel item={item} count={badge} />
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
