"use client";

import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/Button";
import { FormError } from "@/components/ui/FormError";
import { TextField } from "@/components/ui/TextField";
import { BUTTON_LABELS, ID_HINT, ID_PROBLEM_MESSAGES, PROFILE_MESSAGES } from "@/domain/messages";
import { checkSaId } from "@/domain/saId";
import { ApiError, apiPost } from "@/lib/api";
import { shakeAndFocus } from "@/lib/forms";
import { IdNumberSchema, SaveResultSchema } from "@/schemas/profile";
import type { DetailsDraft } from "./DetailsStep";
import { useHeadingFocus } from "./useHeadingFocus";

const FIELD_ID = "work-idNumber";
const FORM_ERROR_ID = "work-id-form-error";
// Server refusals that are about the ID itself are shown on the ID field; anything else under the button.
const ID_CODES = new Set(["id_in_use", "id_locked", ...Object.keys(ID_PROBLEM_MESSAGES)]);

interface IdStepProps {
  details: DetailsDraft;
  onBack: () => void;
  onSaved: (idLastFour: string) => void;
}

/**
 * Step 2: checks the ID in the browser for a quick answer, then saves the
 * details and the ID together. The server checks everything again and keeps
 * only the hash and the last four digits.
 */
export function IdStep({ details, onBack, onSaved }: IdStepProps) {
  const [idNumber, setIdNumber] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const heading = useHeadingFocus(true);

  const refuse = (message: string) => {
    setError(message);
    requestAnimationFrame(() => shakeAndFocus(FIELD_ID));
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (busy) return;
    setFormError(null);
    const parsed = IdNumberSchema.safeParse(idNumber);
    if (!parsed.success) return refuse(ID_PROBLEM_MESSAGES.format);
    const check = checkSaId(parsed.data, new Date());
    if (!check.ok) return refuse(ID_PROBLEM_MESSAGES[check.error]);

    setBusy(true);
    try {
      await apiPost("/api/profile/worker", { ...details, idNumber: parsed.data }, SaveResultSchema);
      onSaved(check.value.lastFour);
    } catch (caught) {
      const apiError = caught instanceof ApiError ? caught : null;
      const message = apiError?.message ?? PROFILE_MESSAGES.fallback;
      if (apiError && ID_CODES.has(apiError.code)) refuse(message);
      else setFormError(message);
      setBusy(false);
    }
  };

  return (
    <form noValidate onSubmit={(event) => void handleSubmit(event)} className="flex flex-col gap-5">
      <h2 ref={heading} tabIndex={-1} className="text-xl font-bold">
        Your ID number
      </h2>
      <TextField
        id={FIELD_ID}
        label="ID number"
        hint={ID_HINT}
        inputMode="numeric"
        autoComplete="off"
        maxLength={16}
        value={idNumber}
        error={error}
        onChange={(event) => {
          setIdNumber(event.target.value);
          setError(null);
        }}
      />
      <div className="flex flex-col gap-3">
        <Button type="submit" busy={busy} busyLabel="Checking your ID" aria-describedby={FORM_ERROR_ID}>
          {BUTTON_LABELS.next}
        </Button>
        <Button variant="secondary" disabled={busy} onClick={onBack}>
          {BUTTON_LABELS.back}
        </Button>
        <FormError id={FORM_ERROR_ID} message={formError} />
      </div>
    </form>
  );
}
