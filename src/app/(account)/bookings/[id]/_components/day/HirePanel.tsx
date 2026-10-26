"use client";

import { useState } from "react";
import { Button, buttonClass } from "@/components/ui/Button";
import { FormError } from "@/components/ui/FormError";
import { HIRE_COPY } from "@/domain/recordCopy";
import type { HireOutcome } from "@/domain/hire";
import { ApiError, apiPost } from "@/lib/api";
import { useApi } from "@/lib/useApi";
import { HireViewSchema, type HireViewResponse } from "@/schemas/record";
import { JobOfferForm } from "./JobOfferForm";

const NOT_NOW = "The job offer did not load. Check your connection, then reload the page.";
const NOT_MARKED = "That was not saved. Check your connection, then tap it again.";

/** Where the young person's answer stands, in the owner's words. */
const answerLine = (offer: NonNullable<HireViewResponse["offer"]>, name: string): string =>
  offer.answer === "interested" ? HIRE_COPY.interested(name) : offer.answer === "not_now" ? HIRE_COPY.notNow(name) : HIRE_COPY.waiting(name);

/**
 * "Offer {name} a job", on the owner's booking once a tryout is done and the
 * pair has worked together enough (hire.ts): an invitation or an offer,
 * recorded once, then sent on WhatsApp. Then the young person's answer, and
 * later the owner marks Hired or Did not work out.
 */
export function HirePanel({ bookingId, name }: { bookingId: string; name: string }) {
  const path = `/api/bookings/${encodeURIComponent(bookingId)}/hire`;
  const { resource, set } = useApi(path, HireViewSchema, NOT_NOW);
  const [busy, setBusy] = useState<HireOutcome | null>(null);
  const [error, setError] = useState<string | null>(null);
  if (resource.status !== "ready") return null;
  const hire = resource.data;
  if (!hire.due && !hire.offer) return null;

  const mark = async (outcome: HireOutcome) => {
    setBusy(outcome);
    setError(null);
    try {
      set(await apiPost(`${path}/outcome`, { outcome }, HireViewSchema));
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : NOT_MARKED);
    }
    setBusy(null);
  };

  return (
    <section aria-labelledby="hire-heading" className="flex flex-col gap-3 border border-line p-4">
      <h2 id="hire-heading" className="text-xl font-bold">
        {HIRE_COPY.offer(name)}
      </h2>
      {hire.offer ? (
        <>
          <p className="text-base">{hire.offer.details ? HIRE_COPY.summary(hire.offer.details) : HIRE_COPY.talkSummary}</p>
          <p className="text-base">{HIRE_COPY.offered(name)}</p>
          {hire.whatsappUrl ? (
            <a href={hire.whatsappUrl} target="_blank" rel="noopener noreferrer" className={buttonClass("secondary")}>
              {HIRE_COPY.send}
            </a>
          ) : null}
          <p className="text-base font-semibold">{answerLine(hire.offer, name)}</p>
          <h3 className="text-base font-bold">{HIRE_COPY.outcomeTitle}</h3>
          {hire.offer.outcome ? (
            <p className="text-base">{hire.offer.outcome === "hired" ? HIRE_COPY.markedHired(name) : HIRE_COPY.markedNotWorkedOut}</p>
          ) : (
            <>
              <Button variant="secondary" busy={busy === "hired"} busyLabel="Saving" onClick={() => void mark("hired")}>
                {HIRE_COPY.hired}
              </Button>
              <Button variant="secondary" busy={busy === "did_not_work_out"} busyLabel="Saving" onClick={() => void mark("did_not_work_out")}>
                {HIRE_COPY.didNotWorkOut}
              </Button>
              <FormError message={error} />
            </>
          )}
        </>
      ) : (
        <>
          <p className="text-base">{HIRE_COPY.why(name)}</p>
          <JobOfferForm path={path} done={set} />
        </>
      )}
    </section>
  );
}
