"use client";

import { useState, type FormEvent } from "react";
import { AboutFields, checkAbout, type AboutDraft, type AboutField } from "@/components/AboutFields";
import { Button } from "@/components/ui/Button";
import { CheckboxGroup } from "@/components/ui/CheckboxGroup";
import { FormError } from "@/components/ui/FormError";
import { TextField } from "@/components/ui/TextField";
import { FIELD_MESSAGES, PROFILE_MESSAGES } from "@/domain/messages";
import { PAYMENT_METHODS, type PaymentMethod } from "@/domain/paymentFlow";
import { PAY_METHODS_QUESTION, payMethodOptions } from "@/domain/paymentMethodCopy";
import { ABOUT_COPY } from "@/domain/profileCopy";
import { ApiError, apiPost } from "@/lib/api";
import { shakeAndFocus } from "@/lib/forms";
import { SaveResultSchema } from "@/schemas/profile";

const PAY_ID = "profile-payMethods";
const SURNAME_ID = "profile-legalSurname";
const ERROR_ID = "profile-edit-error";
const OPTIONS = payMethodOptions(PAYMENT_METHODS);
const idOf = (field: AboutField) => `profile-${field}`;

interface WorkerEditFormProps {
  initial: { payMethods: readonly PaymentMethod[]; about: AboutDraft };
  /** A profile from before the surname was asked: it's asked here, once. */
  askSurname: boolean;
}

/**
 * What a young person can change on their profile: how businesses can pay
 * them, what they can do, their languages and their introduction. A booking
 * keeps the ways to be paid chosen when it was made.
 */
export function WorkerEditForm({ initial, askSurname }: WorkerEditFormProps) {
  const [methods, setMethods] = useState<PaymentMethod[]>([...initial.payMethods]);
  const [about, setAbout] = useState<AboutDraft>(initial.about);
  const [surname, setSurname] = useState("");
  const [errors, setErrors] = useState<Partial<Record<AboutField | "payMethods" | "legalSurname", string>>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);

  const changed = () => {
    setSaved(false);
    setFormError(null);
  };
  const updateAbout = <K extends AboutField>(field: K, value: AboutDraft[K]) => {
    setAbout((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: undefined }));
    changed();
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (busy) return;
    changed();
    if (methods.length === 0) {
      setErrors({ payMethods: FIELD_MESSAGES.payMethods });
      return requestAnimationFrame(() => shakeAndFocus(PAY_ID));
    }
    const aboutErrors = checkAbout(about, idOf);
    if (aboutErrors) return setErrors(aboutErrors);
    if (askSurname && !surname.trim()) {
      setErrors({ legalSurname: FIELD_MESSAGES.surname });
      return requestAnimationFrame(() => shakeAndFocus(SURNAME_ID));
    }
    setBusy(true);
    try {
      await apiPost("/api/profile/worker/edit", { payMethods: methods, ...about, ...(askSurname ? { legalSurname: surname.trim() } : {}) }, SaveResultSchema);
      setSaved(true);
    } catch (caught) {
      setFormError(caught instanceof ApiError ? caught.message : PROFILE_MESSAGES.fallback);
    }
    setBusy(false);
  };

  return (
    <form noValidate onSubmit={(event) => void submit(event)} className="flex flex-col gap-4">
      <CheckboxGroup
        id={PAY_ID}
        legend={PAY_METHODS_QUESTION.legend}
        hint={PAY_METHODS_QUESTION.hint}
        options={OPTIONS}
        values={methods}
        error={errors.payMethods}
        onChange={(values) => {
          setMethods(values);
          setErrors((current) => ({ ...current, payMethods: undefined }));
          changed();
        }}
      />
      <AboutFields draft={about} errors={errors} update={updateAbout} idOf={idOf} />
      {askSurname ? (
        <TextField id={SURNAME_ID} label={ABOUT_COPY.surname} hint={ABOUT_COPY.surnameHint} autoComplete="family-name" value={surname} error={errors.legalSurname} onChange={(event) => setSurname(event.target.value)} />
      ) : null}
      <div className="flex flex-col gap-3">
        <Button type="submit" busy={busy} busyLabel="Saving" aria-describedby={ERROR_ID}>
          Save changes
        </Button>
        <p role="status" className="font-semibold text-go">
          {saved ? "Saved. Businesses see these when you apply." : ""}
        </p>
        <FormError id={ERROR_ID} message={formError} />
      </div>
    </form>
  );
}
