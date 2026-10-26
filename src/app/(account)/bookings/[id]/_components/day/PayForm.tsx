"use client";

import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/Button";
import { FormError } from "@/components/ui/FormError";
import { RadioGroup } from "@/components/ui/RadioGroup";
import { TextField } from "@/components/ui/TextField";
import { RULES } from "@/config/rules";
import { BOOKING_COPY } from "@/domain/bookingMessages";
import { DAY_COPY, MARK_PAID_MESSAGES } from "@/domain/dayMessages";
import { parseRand } from "@/domain/money";
import { isElectronic, type PaymentMethod } from "@/domain/paymentFlow";
import { METHOD_LABELS } from "@/domain/paymentMethodCopy";
import { useStep } from "@/lib/useStep";

const ERROR_ID = "pay-error";

interface PayFormProps {
  bookingId: string;
  name: string;
  /** Their number for payments, as the owner pays to it. */
  phone: string;
  /** Only the ways the young person chose on their profile. */
  methods: readonly PaymentMethod[];
  owedCents: number;
  minimumCents: number;
  done: () => void;
}

/**
 * The owner pays by their own means, by one of the young person's methods,
 * then says how and how much. The amount starts at what's owed. An electronic
 * payment asks for its reference; cash is handed over and confirmed on the spot.
 */
export function PayForm({ bookingId, name, phone, methods, owedCents, minimumCents, done }: PayFormProps) {
  const [method, setMethod] = useState<PaymentMethod | undefined>(methods.length === 1 ? methods[0] : undefined);
  const [amount, setAmount] = useState((owedCents / 100).toFixed(2));
  const [reference, setReference] = useState("");
  const step = useStep(`/api/bookings/${encodeURIComponent(bookingId)}/paid`, MARK_PAID_MESSAGES.not_found, done);
  const options = methods.map((value) => ({ value, label: METHOD_LABELS[value] }));

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (step.busy) return;
    const cents = parseRand(amount);
    if (!method) return step.setError("Choose how you paid.");
    if (cents === null) return step.setError(DAY_COPY.amountInvalid);
    if (cents < minimumCents) return step.setError(MARK_PAID_MESSAGES.below_minimum);
    const sentReference = isElectronic(method) ? reference.trim() : "";
    if (sentReference.length > RULES.paymentReferenceMaxChars) return step.setError(DAY_COPY.referenceTooLong);
    void step.send({ method, amountCents: cents, ...(sentReference ? { reference: sentReference } : {}) });
  };

  return (
    <form noValidate onSubmit={submit} aria-labelledby="pay-heading" className="flex flex-col gap-4 border border-line p-4">
      <h2 id="pay-heading" className="text-xl font-bold">
        {DAY_COPY.payTitle}
      </h2>
      <p className="text-base">{BOOKING_COPY.payment}</p>
      <RadioGroup id="pay-method" legend={DAY_COPY.methodLegend} hint={DAY_COPY.methodHint(name, phone)} options={options} value={method} onChange={setMethod} />
      {method === "cash" ? <p className="text-base font-semibold">{DAY_COPY.cashHandover(name)}</p> : null}
      {method && isElectronic(method) ? (
        <TextField id="pay-reference" label={DAY_COPY.reference} hint={DAY_COPY.referenceHint(name)} autoComplete="off" maxLength={RULES.paymentReferenceMaxChars} value={reference} onChange={(event) => setReference(event.target.value)} />
      ) : null}
      <TextField id="pay-amount" label={DAY_COPY.amount} hint={DAY_COPY.amountHint(owedCents, minimumCents)} inputMode="decimal" value={amount} onChange={(event) => setAmount(event.target.value)} />
      <div className="flex flex-col gap-3">
        <Button type="submit" busy={step.busy} busyLabel="Saving" aria-describedby={ERROR_ID}>
          {DAY_COPY.paid}
        </Button>
        <FormError id={ERROR_ID} message={step.error} />
      </div>
      <p className="text-sm text-muted">{DAY_COPY.paidTooMuch}</p>
    </form>
  );
}
