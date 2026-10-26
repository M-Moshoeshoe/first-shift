import type { ReactNode } from "react";
import { MarketingFooter } from "../MarketingFooter";
import { MarketingHeader } from "../MarketingHeader";

/**
 * Marketing pages, and the 404 and error pages: the header (hiding on scroll,
 * a drawer on phones), the screen's bands inside main, and the footer. No auth
 * code, so these pages stay light. Account screens use AppShell instead.
 */
export function PageShell({ children }: { children: ReactNode }) {
  return (
    <>
      <MarketingHeader />
      <main>{children}</main>
      <MarketingFooter />
    </>
  );
}
