"use client";

import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/Button";
import { FormError } from "@/components/ui/FormError";
import { RadioGroup } from "@/components/ui/RadioGroup";
import { CHECKOUT_REASONS, type CheckoutReason } from "@/domain/bookings";
import { CHECK_IN_MESSAGES, CHECKOUT_LABELS, DAY_COPY } from "@/domain/dayMessages";
import { ANSWER_ORDER, ANSWER_QUESTIONS, REFERENCE_COPY } from "@/domain/recordCopy";
import type { OwnerAnswers } from "@/domain/references";
import { shakeAndFocus } from "@/lib/forms";
import { useStep } from "@/lib/useStep";

const ERROR_ID = "check-out-error";
const YES_NO = [
  { value: "yes", label: "Yes" },
  { value: "no", label: "No" },
] as const;
type YesNo = (typeof YES_NO)[number]["value"];
const answerId = (key: keyof OwnerAnswers) => `check-out-${key}`;

/**
 * The owner checks out with how the day ended and three required answers:
 * on time, did the work as asked, would hire again. The reference is written
 * from those answers only; the server works out what's owed (settle()).
 */
export function CheckOutForm({ bookingId, name, done }: { bookingId: string; name: string; done: () => void }) {
  const [reason, setReason] = useState<CheckoutReason | undefined>(undefined);
  const [answers, setAnswers] = useState<Partial<Record<keyof OwnerAnswers, YesNo>>>({});
  const step = useStep(`/api/bookings/${encodeURIComponent(bookingId)}/check-out`, CHECK_IN_MESSAGES.not_found, done);
  const options = CHECKOUT_REASONS.map((value) => ({ value, label: CHECKOUT_LABELS[value](name) }));

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (step.busy) return;
    if (!reason) {
      requestAnimationFrame(() => shakeAndFocus("check-out-reason"));
      return step.setError("Choose how the day ended.");
    }
    const missing = ANSWER_ORDER.find((key) => !answers[key]);
    if (missing) {
      requestAnimationFrame(() => shakeAndFocus(answerId(missing)));
      return step.setError(REFERENCE_COPY.answersNeeded);
    }
    void step.send({ reason, answers: { onTime: answers.onTime === "yes", didTheWork: answers.didTheWork === "yes", wouldHireAgain: answers.wouldHireAgain === "yes" } });
  };

  return (
    <form noValidate onSubmit={submit} aria-labelledby="check-out-heading" className="flex flex-col gap-4 border-2 border-ink p-4">
      <h2 id="check-out-heading" className="text-xl font-bold">
        {DAY_COPY.checkOutTitle}
      </h2>
      <RadioGroup id="check-out-reason" legend={DAY_COPY.checkOutLegend} options={options} value={reason} onChange={setReason} />
      {reason === "safety" ? <p className="text-sm">{DAY_COPY.safetyReview}</p> : null}
      <p className="text-sm text-muted">{REFERENCE_COPY.answersHint}</p>
      {ANSWER_ORDER.map((key) => (
        <RadioGroup key={key} id={answerId(key)} legend={ANSWER_QUESTIONS[key]} options={YES_NO} value={answers[key]} onChange={(value) => setAnswers((current) => ({ ...current, [key]: value }))} />
      ))}
      <div className="flex flex-col gap-3">
        <Button type="submit" busy={step.busy} busyLabel="Checking out" aria-describedby={ERROR_ID}>
          {DAY_COPY.checkOut}
        </Button>
        <FormError id={ERROR_ID} message={step.error} />
      </div>
      <p className="text-sm text-muted">{REFERENCE_COPY.ownerNote}</p>
    </form>
  );
}
