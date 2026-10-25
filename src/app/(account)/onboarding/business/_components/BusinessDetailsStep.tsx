"use client";

import { useState, type FormEvent } from "react";
import { AreaField } from "@/components/ui/AreaField";
import { Button } from "@/components/ui/Button";
import { FormError } from "@/components/ui/FormError";
import { TextField } from "@/components/ui/TextField";
import { BUTTON_LABELS } from "@/domain/buttonLabels";
import { PROFILE_MESSAGES } from "@/domain/messages";
import { ApiError, apiPost } from "@/lib/api";
import { fieldErrors, firstInvalid, shakeAndFocus } from "@/lib/forms";
import { useHeadingFocus } from "@/lib/useHeadingFocus";
import { BusinessDetailsSchema, SaveResultSchema } from "@/schemas/profile";

export interface BusinessDraft {
  name: string;
  area: string;
  openingHours: string;
}

const FIELDS = ["name", "area", "openingHours"] as const;
type Field = (typeof FIELDS)[number];
const fieldId = (field: Field) => `business-${field}`;
const FORM_ERROR_ID = "business-details-form-error";

interface BusinessDetailsStepProps {
  initial: BusinessDraft;
  focusHeading: boolean;
  onSaved: (draft: BusinessDraft) => void;
}

/** Step 1: checked in the browser with the server's schema, then saved straight away (no pin needed yet). */
export function BusinessDetailsStep({ initial, focusHeading, onSaved }: BusinessDetailsStepProps) {
  const [draft, setDraft] = useState(initial);
  const [errors, setErrors] = useState<Partial<Record<Field, string>>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const heading = useHeadingFocus(focusHeading);

  const update = (field: Field, value: string) => {
    setDraft((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: undefined }));
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (busy) return;
    setFormError(null);
    const parsed = BusinessDetailsSchema.safeParse(draft);
    if (!parsed.success) {
      const next = fieldErrors(parsed.error, FIELDS);
      setErrors(next);
      const first = firstInvalid(next, FIELDS);
      if (first) requestAnimationFrame(() => shakeAndFocus(fieldId(first)));
      return;
    }
    setBusy(true);
    try {
      // Without a location, the server keeps any pin already saved.
      await apiPost("/api/profile/business", parsed.data, SaveResultSchema);
      onSaved(draft);
    } catch (caught) {
      setFormError(caught instanceof ApiError ? caught.message : PROFILE_MESSAGES.fallback);
      setBusy(false);
    }
  };

  return (
    <form noValidate onSubmit={(event) => void handleSubmit(event)} className="flex flex-col gap-4">
      <h2 ref={heading} tabIndex={-1} className="text-xl font-bold">
        About your business
      </h2>
      <TextField id={fieldId("name")} label="Business name" autoComplete="organization" value={draft.name} error={errors.name} onChange={(event) => update("name", event.target.value)} />
      <AreaField id={fieldId("area")} label="Area" hint="Where your business is, like Midrand." value={draft.area} error={errors.area} onChange={(event) => update("area", event.target.value)} />
      <TextField
        id={fieldId("openingHours")}
        label="Opening hours"
        hint="Like Monday to Saturday, 8:00 to 17:00."
        value={draft.openingHours}
        error={errors.openingHours}
        onChange={(event) => update("openingHours", event.target.value)}
      />
      <div className="flex flex-col gap-3">
        <Button type="submit" busy={busy} busyLabel="Saving your details" aria-describedby={FORM_ERROR_ID}>
          {BUTTON_LABELS.next}
        </Button>
        <FormError id={FORM_ERROR_ID} message={formError} />
      </div>
    </form>
  );
}
