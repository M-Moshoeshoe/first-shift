"use client";

import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/Button";
import { FormError } from "@/components/ui/FormError";
import { TextField } from "@/components/ui/TextField";
import { BUTTON_LABELS } from "@/domain/buttonLabels";
import { FIELD_MESSAGES, ID_HINT, ID_PROBLEM_MESSAGES, PROFILE_MESSAGES } from "@/domain/messages";
import { ABOUT_COPY } from "@/domain/profileCopy";
import type { AboutDraft } from "@/components/AboutFields";
import { checkSaId } from "@/domain/saId";
import { ApiError, apiPost } from "@/lib/api";
import { shakeAndFocus } from "@/lib/forms";
import { IdNumberSchema, SaveResultSchema } from "@/schemas/profile";
import type { DetailsDraft } from "./DetailsStep";
import { useHeadingFocus } from "@/lib/useHeadingFocus";

const FIELD_ID = "work-idNumber";
const SURNAME_ID = "work-legalSurname";
const FORM_ERROR_ID = "work-id-form-error";
// Server refusals that are about the ID itself are shown on the ID field; anything else under the button.
const ID_CODES = new Set(["id_in_use", "id_locked", ...Object.keys(ID_PROBLEM_MESSAGES)]);

interface IdStepProps {
  details: DetailsDraft;
  about: AboutDraft;
  /** Kept by the flow, so going back and forth doesn't lose it. The ID number is never kept. */
  surname: string;
  onSurname: (surname: string) => void;
  onBack: () => void;
  onSaved: (idLastFour: string) => void;
}

/**
 * Step 3: the surname and the ID number. The ID is checked in the browser
 * for a quick answer, then everything is saved together. The server checks it
 * all again and keeps only the hash and the last four digits; the surname is
 * private, never shown to a business.
 */
export function IdStep({ details, about, surname, onSurname, onBack, onSaved }: IdStepProps) {
  const [surnameError, setSurnameError] = useState<string | null>(null);
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
    if (!surname.trim()) {
      setSurnameError(FIELD_MESSAGES.surname);
      requestAnimationFrame(() => shakeAndFocus(SURNAME_ID));
      return;
    }
    const parsed = IdNumberSchema.safeParse(idNumber);
    if (!parsed.success) return refuse(ID_PROBLEM_MESSAGES.format);
    const check = checkSaId(parsed.data, new Date());
    if (!check.ok) return refuse(ID_PROBLEM_MESSAGES[check.error]);

    setBusy(true);
    try {
      await apiPost("/api/profile/worker", { ...details, ...about, legalSurname: surname.trim(), idNumber: parsed.data }, SaveResultSchema);
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
    <form noValidate onSubmit={(event) => void handleSubmit(event)} className="flex flex-col gap-4">
      <h2 ref={heading} tabIndex={-1} className="text-xl font-bold">
        Your ID number
      </h2>
      <TextField
        id={SURNAME_ID}
        label={ABOUT_COPY.surname}
        hint={ABOUT_COPY.surnameHint}
        autoComplete="family-name"
        value={surname}
        error={surnameError}
        onChange={(event) => {
          onSurname(event.target.value);
          setSurnameError(null);
        }}
      />
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
