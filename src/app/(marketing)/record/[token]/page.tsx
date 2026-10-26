import type { Metadata } from "next";
import { Band } from "@/components/ui/Band";
import { PageShell } from "@/components/ui/PageShell";
import { RECORD_COPY } from "@/domain/recordCopy";
import { SharedRecordView } from "./_components/SharedRecordView";

// Shared by the young person with whoever they choose, such as an employer: never in search results.
export const metadata: Metadata = {
  title: RECORD_COPY.metaTitle,
  description: RECORD_COPY.metaDescription,
  robots: { index: false, follow: false },
  openGraph: { title: RECORD_COPY.metaTitle, description: RECORD_COPY.metaDescription, type: "profile", siteName: "First Shift" },
};

/** One shell built ahead of time for npm run budget; every token loads the same small page and asks the server. */
export function generateStaticParams() {
  return [{ token: "token" }];
}

/** A young person's shared work record. No account needed, no sign-in code loaded; approved content only. */
export default function SharedRecordPage() {
  return (
    <PageShell>
      <Band tone="paper">
        <SharedRecordView />
      </Band>
    </PageShell>
  );
}
