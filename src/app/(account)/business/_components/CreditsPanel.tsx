import Link from "next/link";
import { RULES } from "@/config/rules";
import { CREDITS_COPY } from "@/domain/creditsCopy";
import { formatRand } from "@/domain/money";

/** How credits work in one line, and the way to the Credits screen. The balance itself is in the summary band above. */
export function CreditsPanel() {
  return (
    <section aria-labelledby="credits-heading" className="flex flex-col gap-2 border border-line p-4">
      <h2 id="credits-heading" className="text-xl font-bold">
        Tryout credits
      </h2>
      {/* A credit is used whenever the young person is owed money, not only on a completed day (docs/MONEY.md). */}
      <p className="text-sm text-muted">
        Your first {RULES.freeCredits} tryouts are free. After that, one {formatRand(RULES.creditPriceCents).replace(/\.00$/, "")} credit is used for each tryout a young person is paid for.
      </p>
      <Link href="/business/credits" className="inline-flex min-h-11 items-center self-start font-semibold underline underline-offset-4">
        {CREDITS_COPY.seeCredits}
      </Link>
    </section>
  );
}
