"use client";

import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/Button";
import { FormError } from "@/components/ui/FormError";
import { TextField } from "@/components/ui/TextField";
import { BUTTON_LABELS } from "@/domain/buttonLabels";
import { ID_PROBLEM_MESSAGES, PROFILE_MESSAGES } from "@/domain/messages";
import { OWNER_FORM_COPY } from "@/domain/profileCopy";
import { checkSaId } from "@/domain/saId";
import { ApiError, apiPost } from "@/lib/api";
import { fieldErrors, firstInvalid, shakeAndFocus } from "@/lib/forms";
import { useHeadingFocus } from "@/lib/useHeadingFocus";
import { IdNumberSchema, OwnerDetailsSchema, SaveResultSchema } from "@/schemas/profile";

export interface OwnerDraft {
  legalName: string;
  phone: string;
  cipc: string;
}

const FIELDS = ["legalName", "idNumber", "phone", "cipc"] as const;
type Field = (typeof FIELDS)[number];
const fieldId = (field: Field) => `owner-${field}`;
const FORM_ERROR_ID = "owner-form-error";
// Server refusals about the ID itself go on the ID field; anything else under the button.
const ID_CODES = new Set(["id_in_use", "id_locked", ...Object.keys(ID_PROBLEM_MESSAGES)]);

interface OwnerDetailsFormProps {
  initial: OwnerDraft;
  onSaved: (draft: OwnerDraft) => void;
  onBack?: () => void;
}

/**
 * The business owner's own details: full legal name, ID number (checked in
 * the browser for a quick answer, then on the server, which keeps only the
 * hash and the last four digits), cellphone number and, optionally, the CIPC
 * number. Business onboarding and the owner page both use it.
 */
export function OwnerDetailsForm({ initial, onSaved, onBack }: OwnerDetailsFormProps) {
  const [draft, setDraft] = useState(initial);
  const [idNumber, setIdNumber] = useState("");
  const [errors, setErrors] = useState<Partial<Record<Field, string>>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const heading = useHeadingFocus(true);

  const update = (field: keyof OwnerDraft, value: string) => {
    setDraft((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: undefined }));
  };
  const refuse = (next: Partial<Record<Field, string>>) => {
    setErrors(next);
    const first = firstInvalid(next, FIELDS);
    if (first) requestAnimationFrame(() => shakeAndFocus(fieldId(first)));
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (busy) return;
    setFormError(null);
    const details = OwnerDetailsSchema.safeParse(draft);
    const id = IdNumberSchema.safeParse(idNumber);
    const check = id.success ? checkSaId(id.data, new Date()) : null;
    const idError = !id.success ? ID_PROBLEM_MESSAGES.format : check && !check.ok ? ID_PROBLEM_MESSAGES[check.error] : undefined;
    const next = { ...(details.success ? {} : fieldErrors(details.error, FIELDS)), ...(idError ? { idNumber: idError } : {}) };
    if (!details.success || idError || !id.success) return refuse(next);

    setBusy(true);
    try {
      await apiPost("/api/profile/owner", { ...details.data, idNumber: id.data }, SaveResultSchema);
      onSaved(draft);
    } catch (caught) {
      const apiError = caught instanceof ApiError ? caught : null;
      const message = apiError?.message ?? PROFILE_MESSAGES.fallback;
      if (apiError && ID_CODES.has(apiError.code)) refuse({ idNumber: message });
      else setFormError(message);
      setBusy(false);
    }
  };

  return (
    <form noValidate onSubmit={(event) => void handleSubmit(event)} className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <h2 ref={heading} tabIndex={-1} className="text-xl font-bold">
          {OWNER_FORM_COPY.title}
        </h2>
        <p className="text-sm text-muted">{OWNER_FORM_COPY.intro}</p>
      </div>
      <TextField id={fieldId("legalName")} label={OWNER_FORM_COPY.legalName} autoComplete="name" value={draft.legalName} error={errors.legalName} onChange={(event) => update("legalName", event.target.value)} />
      <TextField
        id={fieldId("idNumber")}
        label={OWNER_FORM_COPY.idNumber}
        hint={OWNER_FORM_COPY.idHint}
        inputMode="numeric"
        autoComplete="off"
        maxLength={16}
        value={idNumber}
        error={errors.idNumber}
        onChange={(event) => {
          setIdNumber(event.target.value);
          setErrors((current) => ({ ...current, idNumber: undefined }));
        }}
      />
      <TextField id={fieldId("phone")} label={OWNER_FORM_COPY.phone} hint={OWNER_FORM_COPY.phoneHint} type="tel" inputMode="tel" autoComplete="tel" value={draft.phone} error={errors.phone} onChange={(event) => update("phone", event.target.value)} />
      <TextField id={fieldId("cipc")} label={OWNER_FORM_COPY.cipc} hint={OWNER_FORM_COPY.cipcHint} autoComplete="off" value={draft.cipc} error={errors.cipc} onChange={(event) => update("cipc", event.target.value)} />
      <div className="flex flex-col gap-3">
        <Button type="submit" busy={busy} busyLabel="Checking your ID" aria-describedby={FORM_ERROR_ID}>
          {BUTTON_LABELS.next}
        </Button>
        {onBack ? (
          <Button variant="secondary" disabled={busy} onClick={onBack}>
            {BUTTON_LABELS.back}
          </Button>
        ) : null}
        <FormError id={FORM_ERROR_ID} message={formError} />
      </div>
    </form>
  );
}
