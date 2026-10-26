"use client";

import { useState } from "react";
import { Button, buttonClass } from "@/components/ui/Button";
import { FormError } from "@/components/ui/FormError";
import type { HireAnswer } from "@/domain/hire";
import { HIRE_COPY } from "@/domain/recordCopy";
import { ApiError, apiPost } from "@/lib/api";
import type { ApplicationsResponse } from "@/schemas/booking";
import { HireAnswerResultSchema } from "@/schemas/record";

type JobOffer = ApplicationsResponse["jobOffers"][number];

/**
 * A job offer from a business the young person did tryouts with: the role,
 * days and pay when it's an offer, the owner's message, and their answer.
 * "I'm interested" opens a WhatsApp message to the owner; "Not right now"
 * changes nothing else (domain/hire.ts).
 */
export function JobOfferCard({ offer, onAnswered }: { offer: JobOffer; onAnswered: () => void }) {
  const [busy, setBusy] = useState<HireAnswer | null>(null);
  const [error, setError] = useState<string | null>(null);

  const answer = async (choice: HireAnswer) => {
    setBusy(choice);
    setError(null);
    try {
      const result = await apiPost(`/api/job-offers/${encodeURIComponent(offer.id)}/answer`, { answer: choice }, HireAnswerResultSchema);
      if (result.whatsappUrl) window.open(result.whatsappUrl, "_blank", "noopener,noreferrer");
      onAnswered();
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : HIRE_COPY.answerFailed);
    }
    setBusy(null);
  };

  return (
    <section aria-labelledby={`job-${offer.id}`} className="flex flex-col gap-3 border border-line p-4">
      <h2 id={`job-${offer.id}`} className="text-xl font-bold">
        {offer.kind === "offer" ? HIRE_COPY.received(offer.businessName) : HIRE_COPY.receivedTalk(offer.businessName)}
      </h2>
      {offer.details ? <p className="text-base">{HIRE_COPY.summary(offer.details)}</p> : null}
      {offer.message ? <p className="text-base">&ldquo;{offer.message}&rdquo;</p> : null}
      {offer.answer === "interested" ? (
        <>
          <p className="text-base">{HIRE_COPY.youInterested(offer.ownerFirstName)}</p>
          {offer.whatsappUrl ? (
            <a href={offer.whatsappUrl} target="_blank" rel="noopener noreferrer" className={buttonClass("secondary")}>
              {HIRE_COPY.messageOwner(offer.ownerFirstName)}
            </a>
          ) : null}
        </>
      ) : offer.answer === "not_now" ? (
        <p className="text-base">{HIRE_COPY.youNotNow}</p>
      ) : (
        <>
          <Button variant="secondary" busy={busy === "interested"} busyLabel={HIRE_COPY.answering} onClick={() => void answer("interested")}>
            {HIRE_COPY.answerInterested}
          </Button>
          <Button variant="secondary" busy={busy === "not_now"} busyLabel={HIRE_COPY.answering} onClick={() => void answer("not_now")}>
            {HIRE_COPY.answerNotNow}
          </Button>
          <FormError message={error} />
        </>
      )}
    </section>
  );
}
