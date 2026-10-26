"use client";

import { SlipSkeleton } from "@/components/SlipSkeleton";
import { Button } from "@/components/ui/Button";
import { FormError } from "@/components/ui/FormError";
import { PageTitle } from "@/components/ui/PageTitle";
import { BUTTON_LABELS } from "@/domain/buttonLabels";
import { CREDIT_PACKS, CREDITS_COPY } from "@/domain/creditsCopy";
import { sastDay } from "@/domain/time";
import { useApi } from "@/lib/useApi";
import { useHeadingFocus } from "@/lib/useHeadingFocus";
import { CreditsViewSchema } from "@/schemas/credits";
import { RequestCredits } from "./RequestCredits";

/** One number with its name, in a row of three. */
function Figure({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex flex-col gap-1">
      <dt className="text-sm text-muted">{label}</dt>
      <dd className="order-first text-xl font-semibold tabular-nums">{value}</dd>
    </div>
  );
}

/** The business's credits: what's available, held and free, how credits work, a request for more, and the history in plain words. */
export function CreditsScreen() {
  const { resource, reload, set } = useApi("/api/credits", CreditsViewSchema, CREDITS_COPY.unavailable);
  const heading = useHeadingFocus(resource.status === "ready");

  if (resource.status === "loading") {
    return (
      <div role="status" aria-label="Loading your credits" className="flex flex-col gap-6">
        <div className="h-11 w-2/3 skeleton" />
        <SlipSkeleton />
      </div>
    );
  }
  if (resource.status === "error") {
    return (
      <div className="flex flex-col gap-3">
        <FormError message={resource.message} />
        <Button variant="secondary" onClick={reload}>
          {BUTTON_LABELS.tryAgain}
        </Button>
      </div>
    );
  }

  const credits = resource.data;
  return (
    <>
      <PageTitle headingRef={heading} title={CREDITS_COPY.title} intro={CREDITS_COPY.intro} />
      {/* The balance first and largest, the rest small beside it. */}
      <section aria-label="Your balance" className="flex flex-col gap-3 border-b border-line pb-6">
        <p className="flex items-baseline gap-2">
          <span className="text-hero font-semibold tabular-nums">{credits.available}</span>
          <span className="text-base">{CREDITS_COPY.available.toLowerCase()}</span>
        </p>
        <dl className="flex gap-6">
          <Figure label={CREDITS_COPY.held} value={credits.held} />
          <Figure label={CREDITS_COPY.free} value={credits.freeLeft} />
        </dl>
        <p className="text-sm text-muted">{CREDITS_COPY.howItWorks}</p>
      </section>
      <section aria-labelledby="credit-packs" className="flex flex-col gap-3">
        <h2 id="credit-packs" className="text-xl">
          {CREDITS_COPY.packsTitle}
        </h2>
        <ul className="grid grid-cols-2 gap-3">
          {CREDIT_PACKS.map((pack) => (
            <li key={pack.credits} className="flex flex-col gap-1 border border-line p-4">
              <span className="text-xl font-semibold tabular-nums">{pack.price}</span>
              <span className="text-sm text-muted">{pack.credits} credits</span>
            </li>
          ))}
        </ul>
        <p className="text-sm text-muted">{CREDITS_COPY.packsNote}</p>
      </section>
      <RequestCredits requestedAt={credits.request?.requestedAt ?? null} onRequested={(requestedAt) => set({ ...credits, request: { requestedAt } })} />
      <section aria-labelledby="credit-history" className="flex flex-col gap-2">
        <h2 id="credit-history" className="text-xl font-bold">
          {CREDITS_COPY.history}
        </h2>
        {credits.history.length === 0 ? (
          <p className="text-base">{CREDITS_COPY.empty}</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {credits.history.map((line, index) => (
              <li key={`${line.at}-${index}`} className="flex flex-wrap gap-x-2 text-base">
                <span className="text-muted tabular-nums">{sastDay(new Date(line.at))}</span>
                <span>{line.text}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}
