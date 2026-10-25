import type { ReactNode } from "react";
import { NAV_MIN_ITEMS, type NavItem } from "@/config/nav";
import { AppHeader } from "./AppHeader";
import { AppNav } from "./AppNav";

interface AppShellProps {
  /** The role's destinations; shown once there are enough of them to be worth a bar (src/config/nav.ts). */
  nav?: readonly NavItem[];
  children: ReactNode;
}

/**
 * Every account screen. On a phone: the header, the screen's bands, and the
 * tab bar. From 1024 px: a full-width header, and the app column on a mist
 * backdrop, paper inside a 2 px ink edge, so it reads as a deliberate app
 * rather than a stretched phone page (docs/DESIGN.md, Layout).
 */
export function AppShell({ nav = [], children }: AppShellProps) {
  const items = nav.length >= NAV_MIN_ITEMS ? nav : [];
  return (
    <div className="flex min-h-dvh flex-col">
      <AppHeader nav={items} />
      <main className={`flex-1 lg:bg-mist lg:px-5 lg:py-12 ${items.length > 0 ? "pb-16 lg:pb-12" : ""}`}>
        <div className="lg:mx-auto lg:max-w-md lg:border-2 lg:border-ink lg:bg-paper">{children}</div>
      </main>
      {items.length > 0 ? <AppNav items={items} /> : null}
    </div>
  );
}
