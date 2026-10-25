"use client";

import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/Button";
import { FormError } from "@/components/ui/FormError";
import { RadioGroup } from "@/components/ui/RadioGroup";
import { TextField } from "@/components/ui/TextField";
import { BOOKING_COPY } from "@/domain/bookingMessages";
import { DAY_COPY, MARK_PAID_MESSAGES, METHOD_LABELS } from "@/domain/dayMessages";
import { parseRand } from "@/domain/money";
import { PAYMENT_METHODS, type PaymentMethod } from "@/domain/paymentFlow";
import { useStep } from "@/lib/useStep";

const ERROR_ID = "pay-error";
const OPTIONS = PAYMENT_METHODS.map((value) => ({ value, label: METHOD_LABELS[value] }));

/** The owner pays by their own means, then says how and how much. The amount starts at what's owed. */
export function PayForm({ bookingId, owedCents, minimumCents, done }: { bookingId: string; owedCents: number; minimumCents: number; done: () => void }) {
  const [method, setMethod] = useState<PaymentMethod | undefined>(undefined);
  const [amount, setAmount] = useState((owedCents / 100).toFixed(2));
  const step = useStep(`/api/bookings/${encodeURIComponent(bookingId)}/paid`, MARK_PAID_MESSAGES.not_found, done);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (step.busy) return;
    const cents = parseRand(amount);
    if (!method) return step.setError("Choose how you paid.");
    if (cents === null) return step.setError(DAY_COPY.amountInvalid);
    if (cents < minimumCents) return step.setError(MARK_PAID_MESSAGES.below_minimum);
    void step.send({ method, amountCents: cents });
  };

  return (
    <form noValidate onSubmit={submit} aria-labelledby="pay-heading" className="flex flex-col gap-4 border-2 border-ink p-4">
      <h2 id="pay-heading" className="text-xl font-bold">
        {DAY_COPY.payTitle}
      </h2>
      <p className="text-lg">{BOOKING_COPY.payment}</p>
      <RadioGroup id="pay-method" legend={DAY_COPY.methodLegend} options={OPTIONS} value={method} onChange={setMethod} />
      <TextField id="pay-amount" label={DAY_COPY.amount} hint={DAY_COPY.amountHint(owedCents, minimumCents)} inputMode="decimal" value={amount} onChange={(event) => setAmount(event.target.value)} />
      <div className="flex flex-col gap-3">
        <Button type="submit" busy={step.busy} busyLabel="Saving" aria-describedby={ERROR_ID}>
          {DAY_COPY.paid}
        </Button>
        <FormError id={ERROR_ID} message={step.error} />
      </div>
    </form>
  );
}
