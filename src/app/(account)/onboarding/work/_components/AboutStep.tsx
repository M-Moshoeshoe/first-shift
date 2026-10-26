"use client";

import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/Button";
import { AboutFields, checkAbout, type AboutDraft, type AboutField } from "@/components/AboutFields";
import { BUTTON_LABELS } from "@/domain/buttonLabels";
import { ABOUT_COPY } from "@/domain/profileCopy";
import { useHeadingFocus } from "@/lib/useHeadingFocus";

/** Step 2: what they can do, the languages they speak, and one line about themselves. Nothing is sent yet. */
export function AboutStep({ initial, onNext, onBack }: { initial: AboutDraft; onNext: (draft: AboutDraft) => void; onBack: () => void }) {
  const [draft, setDraft] = useState(initial);
  const [errors, setErrors] = useState<Partial<Record<AboutField, string>>>({});
  const heading = useHeadingFocus(true);

  const update = <K extends AboutField>(field: K, value: AboutDraft[K]) => {
    setDraft((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: undefined }));
  };

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    const problems = checkAbout(draft);
    if (!problems) return onNext(draft);
    setErrors(problems);
  };

  return (
    <form noValidate onSubmit={handleSubmit} className="flex flex-col gap-4">
      <h2 ref={heading} tabIndex={-1} className="text-xl font-bold">
        {ABOUT_COPY.title}
      </h2>
      <AboutFields draft={draft} errors={errors} update={update} />
      <div className="flex flex-col gap-3">
        <Button type="submit">{BUTTON_LABELS.next}</Button>
        <Button variant="secondary" onClick={onBack}>
          {BUTTON_LABELS.back}
        </Button>
      </div>
    </form>
  );
}
