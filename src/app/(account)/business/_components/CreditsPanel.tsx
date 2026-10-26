import Link from "next/link";
import { RULES } from "@/config/rules";
import { CREDITS_COPY } from "@/domain/creditsCopy";
import { formatRand } from "@/domain/money";

/** The business's credit balance, how credits work in one line, and the way to the Credits screen. */
export function CreditsPanel({ available, onlyFree }: { available: number; onlyFree: boolean }) {
  return (
    <section aria-labelledby="credits-heading" className="flex flex-col gap-2 border border-line p-4">
      <h2 id="credits-heading" className="text-xl font-bold">
        Tryout credits
      </h2>
      <p className="text-base font-semibold tabular-nums">{onlyFree ? `Free tryouts left: ${available}` : `Credits: ${available}`}</p>
      <p className="text-sm text-muted">
        Your first {RULES.freeCredits} tryouts are free. After that, each completed tryout uses one {formatRand(RULES.creditPriceCents).replace(/\.00$/, "")} credit.
      </p>
      <Link href="/business/credits" className="inline-flex min-h-11 items-center self-start font-semibold underline underline-offset-4">
        {CREDITS_COPY.seeCredits}
      </Link>
    </section>
  );
}
