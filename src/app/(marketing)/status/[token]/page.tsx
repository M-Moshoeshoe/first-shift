import type { Metadata } from "next";
import { Band } from "@/components/ui/Band";
import { PageShell } from "@/components/ui/PageShell";
import { TripStatus } from "./_components/TripStatus";

// A private link for one trusted person: never in search results.
export const metadata: Metadata = { title: "Tryout status on First Shift", robots: { index: false, follow: false } };

/** One shell built ahead of time for npm run budget; every token loads the same small page and asks the server. */
export function generateStaticParams() {
  return [{ token: "token" }];
}

/** "Share my trip": what a young person's trusted contact sees. No account needed, no sign-in code loaded. */
export default function StatusPage() {
  return (
    <PageShell>
      <Band tone="paper">
        <TripStatus />
      </Band>
    </PageShell>
  );
}
