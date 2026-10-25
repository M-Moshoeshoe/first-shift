"use client";

import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/Button";
import { FormError } from "@/components/ui/FormError";
import { RadioGroup } from "@/components/ui/RadioGroup";
import { CHECKOUT_REASONS, type CheckoutReason } from "@/domain/bookings";
import { CHECK_IN_MESSAGES, CHECKOUT_LABELS, DAY_COPY } from "@/domain/dayMessages";
import { useStep } from "@/lib/useStep";

const ERROR_ID = "check-out-error";

/** The owner checks out with how the day ended; the server works out what's owed (settle()). */
export function CheckOutForm({ bookingId, name, done }: { bookingId: string; name: string; done: () => void }) {
  const [reason, setReason] = useState<CheckoutReason | undefined>(undefined);
  const step = useStep(`/api/bookings/${encodeURIComponent(bookingId)}/check-out`, CHECK_IN_MESSAGES.not_found, done);
  const options = CHECKOUT_REASONS.map((value) => ({ value, label: CHECKOUT_LABELS[value](name) }));

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (step.busy) return;
    if (!reason) return step.setError("Choose how the day ended.");
    void step.send({ reason });
  };

  return (
    <form noValidate onSubmit={submit} aria-labelledby="check-out-heading" className="flex flex-col gap-4 border-2 border-ink p-4">
      <h2 id="check-out-heading" className="text-xl font-bold">
        {DAY_COPY.checkOutTitle}
      </h2>
      <RadioGroup id="check-out-reason" legend={DAY_COPY.checkOutLegend} options={options} value={reason} onChange={setReason} />
      {reason === "safety" ? <p className="text-sm">{DAY_COPY.safetyReview}</p> : null}
      <div className="flex flex-col gap-3">
        <Button type="submit" busy={step.busy} busyLabel="Checking out" aria-describedby={ERROR_ID}>
          {DAY_COPY.checkOut}
        </Button>
        <FormError id={ERROR_ID} message={step.error} />
      </div>
    </form>
  );
}
