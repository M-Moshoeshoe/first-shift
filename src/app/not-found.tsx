import type { Metadata } from "next";
import Link from "next/link";
import { Band } from "@/components/ui/Band";
import { buttonClass } from "@/components/ui/Button";
import { PageShell } from "@/components/ui/PageShell";
import { PageTitle } from "@/components/ui/PageTitle";
import { BUTTON_LABELS } from "@/domain/buttonLabels";

export const metadata: Metadata = { title: "Page not found on First Shift" };

/** Any address that doesn't exist: say so plainly and give one way home. */
export default function NotFound() {
  return (
    <PageShell>
      <Band tone="paper">
        <PageTitle title="We can't find that page" intro="The link may be old or mistyped. Start again from the home page." />
        <Link href="/" className={buttonClass("primary")}>
          {BUTTON_LABELS.goHome}
        </Link>
      </Band>
    </PageShell>
  );
}
