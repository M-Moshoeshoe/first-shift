"use client";

import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/Button";
import { CheckboxGroup } from "@/components/ui/CheckboxGroup";
import { FormError } from "@/components/ui/FormError";
import { FIELD_MESSAGES, PROFILE_MESSAGES } from "@/domain/messages";
import { PAYMENT_METHODS, type PaymentMethod } from "@/domain/paymentFlow";
import { PAY_METHODS_QUESTION, payMethodOptions } from "@/domain/paymentMethodCopy";
import { ApiError, apiPost } from "@/lib/api";
import { shakeAndFocus } from "@/lib/forms";
import { SaveResultSchema } from "@/schemas/profile";

const FIELD_ID = "profile-payMethods";
const ERROR_ID = "profile-pay-error";
const OPTIONS = payMethodOptions(PAYMENT_METHODS);

/** "How can businesses pay you?", changed at any time. A booking keeps the ways chosen when it was made. */
export function PayMethodsForm({ initial }: { initial: readonly PaymentMethod[] }) {
  const [methods, setMethods] = useState<PaymentMethod[]>([...initial]);
  const [error, setError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (busy) return;
    setFormError(null);
    setSaved(false);
    if (methods.length === 0) {
      setError(FIELD_MESSAGES.payMethods);
      requestAnimationFrame(() => shakeAndFocus(FIELD_ID));
      return;
    }
    setBusy(true);
    try {
      await apiPost("/api/profile/worker/edit", { payMethods: methods }, SaveResultSchema);
      setSaved(true);
    } catch (caught) {
      setFormError(caught instanceof ApiError ? caught.message : PROFILE_MESSAGES.fallback);
    }
    setBusy(false);
  };

  return (
    <form noValidate onSubmit={(event) => void submit(event)} className="flex flex-col gap-4">
      <CheckboxGroup
        id={FIELD_ID}
        legend={PAY_METHODS_QUESTION.legend}
        hint={PAY_METHODS_QUESTION.hint}
        options={OPTIONS}
        values={methods}
        error={error}
        onChange={(values) => {
          setMethods(values);
          setError(null);
          setSaved(false);
        }}
      />
      <div className="flex flex-col gap-3">
        <Button type="submit" busy={busy} busyLabel="Saving" aria-describedby={ERROR_ID}>
          Save changes
        </Button>
        <p role="status" className="font-bold text-go">
          {saved ? "Saved. Businesses will see these ways when they book you." : ""}
        </p>
        <FormError id={ERROR_ID} message={formError} />
      </div>
    </form>
  );
}
