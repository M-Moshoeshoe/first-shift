"use client";

import { lazy, Suspense, type ReactNode } from "react";
import { isDemoEmail } from "@/domain/demo";
import { useAuth } from "@/lib/auth/useAuth";
import { useBadge } from "@/lib/useBadge";
import { NAV_MIN_ITEMS, type NavItem } from "@/config/nav";
import { AppHeader } from "./AppHeader";
import { AppNav } from "./AppNav";
import { Toaster } from "./Toaster";

// Demo accounts only, so real people never download it.
const DemoBar = lazy(() => import("./DemoBar").then((module) => ({ default: module.DemoBar })));
// App screens only, after the screen has drawn: sign-in never downloads it.
const HelpButton = lazy(() => import("./HelpButton").then((module) => ({ default: module.HelpButton })));

interface AppShellProps {
  /** The role's destinations; shown once there are enough of them to be worth a bar (src/config/nav.ts). */
  nav?: readonly NavItem[];
  /** The screen draws its own card on the mist backdrop at every width (sign-in), instead of the desktop app column. */
  bare?: boolean;
  children: ReactNode;
}

/**
 * Every account screen. On a phone: the header, the screen's bands, and the
 * tab bar. From 1024 px: a full-width header, and the app column on a mist
 * backdrop, paper inside a 2 px ink edge, so it reads as a deliberate app
 * rather than a stretched phone page (docs/DESIGN.md, Layout).
 */
export function AppShell({ nav = [], bare = false, children }: AppShellProps) {
  const items = nav.length >= NAV_MIN_ITEMS ? nav : [];
  const badge = useBadge(items.length > 0);
  const { user } = useAuth();
  return (
    <div className="flex min-h-dvh flex-col">
      <AppHeader nav={items} badge={badge} />
      {isDemoEmail(user?.email ?? undefined) ? (
        <Suspense fallback={null}>
          <DemoBar />
        </Suspense>
      ) : null}
      {bare ? (
        <main className="flex-1 bg-mist px-5 py-8 lg:py-12">{children}</main>
      ) : (
        // Room at the end of every page for the Help button (bottom 16 or 80 px, 44 px tall) and the tab bar, so nothing stays under them.
        <main className={`flex-1 lg:bg-mist lg:px-5 lg:py-12 ${items.length > 0 ? "pb-36 lg:pb-12" : "pb-16 lg:pb-12"}`}>
          <div className="lg:mx-auto lg:max-w-md lg:border lg:border-line lg:bg-paper">{children}</div>
        </main>
      )}
      {items.length > 0 ? <AppNav items={items} badge={badge} /> : null}
      {bare ? null : (
        <Suspense fallback={null}>
          <HelpButton aboveNav={items.length > 0} />
        </Suspense>
      )}
      <Toaster />
    </div>
  );
}
