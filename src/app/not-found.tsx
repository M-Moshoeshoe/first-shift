import type { Metadata } from "next";
import Link from "next/link";
import { Band } from "@/components/ui/Band";
import { buttonClass } from "@/components/ui/Button";
import { SimpleShell } from "@/components/ui/SimpleShell";
import { MarketingFooter } from "@/components/MarketingFooter";
import { PageTitle } from "@/components/ui/PageTitle";
import { BUTTON_LABELS } from "@/domain/buttonLabels";

export const metadata: Metadata = { title: "Page not found on First Shift" };

/** Any address that doesn't exist: say so plainly and give one way home. */
export default function NotFound() {
  return (
    <SimpleShell footer={<MarketingFooter />}>
      <Band tone="paper" wide>
        {/* Wide, so the text lines up with the header logo; the column keeps lines short. */}
        <div className="flex max-w-2xl flex-col gap-6">
          <PageTitle title="We cannot find that page" intro="The link may be old or mistyped. Start again from the home page." />
          <Link href="/" className={buttonClass("primary")}>
            {BUTTON_LABELS.goHome}
          </Link>
        </div>
      </Band>
    </SimpleShell>
  );
}
