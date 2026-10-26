"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
import { SlipSkeleton } from "@/components/SlipSkeleton";
import { Button } from "@/components/ui/Button";
import { FormError } from "@/components/ui/FormError";
import { PageTitle } from "@/components/ui/PageTitle";
import { BUTTON_LABELS } from "@/domain/buttonLabels";
import { keepAfterFare } from "@/domain/fares";
import { DETAIL_COPY } from "@/domain/findingMessages";
import { useHeadingFocus } from "@/lib/useHeadingFocus";
import { useTryoutDetail } from "@/lib/useTryoutDetail";
import { FeedSlip } from "../../../_components/FeedSlip";
import { ApplyPanel } from "./ApplyPanel";

const backLink = (
  <Link href="/work" className="flex min-h-11 items-center self-start underline underline-offset-4">
    {DETAIL_COPY.back}
  </Link>
);

/** A titled list of plain lines: the tasks, and the safety lines. */
function LineList({ id, heading, lines }: { id: string; heading: string; lines: readonly string[] }) {
  return (
    <section aria-labelledby={id} className="flex flex-col gap-2">
      <h2 id={id} className="text-xl font-bold">
        {heading}
      </h2>
      <ul className="flex list-disc flex-col gap-1 pl-5 text-base">
        {lines.map((line) => (
          <li key={line}>{line}</li>
        ))}
      </ul>
    </section>
  );
}

/** One tryout in full: the slip, the tasks, the pay worked out, the safety lines, and applying. Focus starts on the title. */
export function TryoutDetail() {
  const { id } = useParams<{ id: string }>();
  const [attempt, setAttempt] = useState(0);
  const { detail, setState } = useTryoutDetail(id, attempt);
  const heading = useHeadingFocus(detail.status === "ready");

  if (detail.status === "loading") {
    return (
      <div role="status" aria-label="Loading the tryout" className="flex flex-col gap-6">
        <div className="h-11 w-2/3 skeleton" />
        <SlipSkeleton />
      </div>
    );
  }

  if (detail.status === "error") {
    return (
      <>
        {backLink}
        <PageTitle title={DETAIL_COPY.unavailableTitle} />
        <div className="flex flex-col gap-3">
          <FormError message={detail.message} />
          {detail.notFound ? null : (
            <Button variant="secondary" onClick={() => setAttempt((count) => count + 1)}>
              {BUTTON_LABELS.tryAgain}
            </Button>
          )}
        </div>
      </>
    );
  }

  const { item, tasks, state } = detail.detail;
  const keep = keepAfterFare(item.payCents, item.returnFareCents);
  return (
    <>
      {backLink}
      <PageTitle headingRef={heading} title={item.title} intro={`${item.businessName}, ${item.area}`} />
      <FeedSlip item={item} />
      <LineList id="tasks-heading" heading={DETAIL_COPY.tasks} lines={tasks} />
      <section aria-labelledby="pay-heading" className="flex flex-col gap-2">
        <h2 id="pay-heading" className="text-xl font-bold">
          {DETAIL_COPY.pay}
        </h2>
        <p className="text-base tabular-nums">{DETAIL_COPY.payLine(item.rateCentsPerHour, item.hours, item.payCents)}</p>
        {item.returnFareCents !== null && keep !== null ? (
          <>
            <p className="text-base tabular-nums">{DETAIL_COPY.returnFare(item.returnFareCents)}</p>
            <p className="text-base font-semibold tabular-nums">{DETAIL_COPY.keep(keep)}</p>
          </>
        ) : null}
      </section>
      <LineList id="safety-heading" heading={DETAIL_COPY.safety} lines={[...DETAIL_COPY.safetyLines, DETAIL_COPY.address]} />
      <ApplyPanel tryoutId={item.id} businessName={item.businessName} state={state} onState={setState} onReload={() => setAttempt((count) => count + 1)} />
    </>
  );
}
