"use client";

import { useState, type FormEvent } from "react";
import { AreaField } from "@/components/ui/AreaField";
import { Button } from "@/components/ui/Button";
import { CheckboxGroup } from "@/components/ui/CheckboxGroup";
import { TextField } from "@/components/ui/TextField";
import { BUTTON_LABELS } from "@/domain/buttonLabels";
import type { Availability } from "@/domain/profile";
import { fieldErrors, firstInvalid, shakeAndFocus } from "@/lib/forms";
import { WorkerDetailsSchema } from "@/schemas/profile";
import { AVAILABILITY_OPTIONS } from "./availability";
import { useHeadingFocus } from "@/lib/useHeadingFocus";

export interface DetailsDraft {
  firstName: string;
  area: string;
  availability: Availability[];
  payoutPhone: string;
}

const FIELDS = ["firstName", "area", "availability", "payoutPhone"] as const;
type Field = (typeof FIELDS)[number];
const fieldId = (field: Field) => `work-${field}`;

interface DetailsStepProps {
  initial: DetailsDraft;
  focusHeading: boolean;
  onNext: (draft: DetailsDraft) => void;
}

/** Step 1, checked in the browser with the same schema the server uses. Nothing is sent yet. */
export function DetailsStep({ initial, focusHeading, onNext }: DetailsStepProps) {
  const [draft, setDraft] = useState(initial);
  const [errors, setErrors] = useState<Partial<Record<Field, string>>>({});
  const heading = useHeadingFocus(focusHeading);

  const update = <K extends Field>(field: K, value: DetailsDraft[K]) => {
    setDraft((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: undefined }));
  };

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    const parsed = WorkerDetailsSchema.safeParse(draft);
    if (parsed.success) return onNext(draft);
    const next = fieldErrors(parsed.error, FIELDS);
    setErrors(next);
    const first = firstInvalid(next, FIELDS);
    if (first) requestAnimationFrame(() => shakeAndFocus(fieldId(first)));
  };

  return (
    <form noValidate onSubmit={handleSubmit} className="flex flex-col gap-4">
      <h2 ref={heading} tabIndex={-1} className="text-xl font-bold">
        About you
      </h2>
      <TextField id={fieldId("firstName")} label="First name" autoComplete="given-name" value={draft.firstName} error={errors.firstName} onChange={(event) => update("firstName", event.target.value)} />
      <AreaField id={fieldId("area")} label="Area" hint="Where you live, like Ivory Park or Tembisa." autoComplete="address-level3" value={draft.area} error={errors.area} onChange={(event) => update("area", event.target.value)} />
      <CheckboxGroup id={fieldId("availability")} legend="When can you work?" options={AVAILABILITY_OPTIONS} values={draft.availability} error={errors.availability} onChange={(values) => update("availability", values)} />
      <TextField
        id={fieldId("payoutPhone")}
        label="Cellphone number for payments"
        hint="Businesses can pay you by FNB eWallet to this number."
        type="tel"
        inputMode="tel"
        autoComplete="tel"
        value={draft.payoutPhone}
        error={errors.payoutPhone}
        onChange={(event) => update("payoutPhone", event.target.value)}
      />
      <Button type="submit">{BUTTON_LABELS.next}</Button>
    </form>
  );
}
