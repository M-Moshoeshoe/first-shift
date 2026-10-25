import { RULES } from "@/config/rules";
import { formatRand } from "@/domain/money";

/** The business's credit balance, and how credits work, in two lines. */
export function CreditsPanel({ available, onlyFree }: { available: number; onlyFree: boolean }) {
  return (
    <section aria-labelledby="credits-heading" className="flex flex-col gap-2 border-2 border-ink p-4">
      <h2 id="credits-heading" className="text-xl font-bold">
        Tryout credits
      </h2>
      <p className="text-lg font-bold tabular-nums">{onlyFree ? `Free tryouts left: ${available}` : `Credits: ${available}`}</p>
      <p className="text-sm text-muted">
        Your first {RULES.freeCredits} tryouts are free. After that, each completed tryout uses one {formatRand(RULES.creditPriceCents).replace(/\.00$/, "")} credit.
      </p>
    </section>
  );
}
