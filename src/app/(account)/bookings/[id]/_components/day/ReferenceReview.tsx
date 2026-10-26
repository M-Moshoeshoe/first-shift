"use client";

import { AiMark } from "@/components/AiMark";
import { useState, type FormEvent } from "react";
import { AnswerList } from "@/components/AnswerList";
import { Button } from "@/components/ui/Button";
import { FormError } from "@/components/ui/FormError";
import { TextAreaField } from "@/components/ui/TextAreaField";
import { REFERENCE_COPY } from "@/domain/recordCopy";
import { ApiError, apiPost } from "@/lib/api";
import { StepResultSchema } from "@/schemas/booking";
import type { ReferenceViewResponse } from "@/schemas/record";

const ERROR_ID = "reference-error";

/**
 * The young person's review: the business's three answers as the criteria,
 * the wording labelled as written with AI, then "Add to my record" or
 * "Challenge it" with a reason, which a person at First Shift looks into.
 */
export function ReferenceReview({ bookingId, reference, done }: { bookingId: string; reference: NonNullable<ReferenceViewResponse["reference"]>; done: () => void }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [challenging, setChallenging] = useState(false);
  const [reason, setReason] = useState("");
  const path = `/api/references/${encodeURIComponent(bookingId)}`;

  const decide = async (body: object) => {
    setBusy(true);
    setError(null);
    try {
      await apiPost(path, body, StepResultSchema);
      done();
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : REFERENCE_COPY.decideFailed);
    }
    setBusy(false);
  };
  const challenge = (event: FormEvent) => {
    event.preventDefault();
    if (reason.trim().length < 3) return setError(REFERENCE_COPY.challengeNeeded);
    void decide({ action: "challenge", reason: reason.trim() });
  };

  const open = reference.status === "draft";
  return (
    <>
      <p className="text-sm font-semibold">{REFERENCE_COPY.criteria}</p>
      <AnswerList answers={reference.answers} />
      <p className="text-base">{reference.text}</p>
      {reference.example ? <p className="text-sm text-muted">{REFERENCE_COPY.example}</p> : <AiMark>{REFERENCE_COPY.writtenWithAi}</AiMark>}
      {reference.status === "approved" ? <p className="font-semibold text-go">{REFERENCE_COPY.added}</p> : null}
      {reference.status === "challenged" ? <p className="text-base">{REFERENCE_COPY.challenged}</p> : null}
      {open && reference.challengeRejected ? <p className="text-base">{REFERENCE_COPY.rejectedNote}</p> : null}
      {open ? (
        <div className="flex flex-col gap-3">
          <Button busy={busy} busyLabel="Saving" aria-describedby={ERROR_ID} onClick={() => void decide({ action: "approve" })}>
            {REFERENCE_COPY.add}
          </Button>
          {!reference.challengeRejected && !challenging ? (
            <Button variant="secondary" onClick={() => setChallenging(true)}>
              {REFERENCE_COPY.challenge}
            </Button>
          ) : null}
        </div>
      ) : null}
      {open && challenging ? (
        <form noValidate onSubmit={challenge} className="flex flex-col gap-3">
          <TextAreaField id="reference-challenge" label={REFERENCE_COPY.challengeReason} hint={REFERENCE_COPY.challengeHint} maxLength={500} value={reason} onChange={(event) => setReason(event.target.value)} />
          <Button type="submit" variant="secondary" busy={busy} busyLabel="Sending" aria-describedby={ERROR_ID}>
            {REFERENCE_COPY.challengeSend}
          </Button>
        </form>
      ) : null}
      <FormError id={ERROR_ID} message={error} />
    </>
  );
}
