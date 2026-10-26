"use client";

import { useEffect, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/Button";
import { FormError } from "@/components/ui/FormError";
import { TextAreaField } from "@/components/ui/TextAreaField";
import { shakeAndFocus } from "@/lib/forms";
import { DraftRequestSchema } from "@/schemas/tryout";
import { AiGuide } from "./AiGuide";

const FIELD_ID = "post-description";
const FORM_ERROR_ID = "post-describe-error";

interface DescribeStepProps {
  initial: string;
  /** Coming back from step 2 or a refusal: focus goes to the sentence, ready to change. */
  focusField: boolean;
  busy: boolean;
  /** A server problem that isn't about the sentence itself, shown under the button. */
  formError: string | null;
  onDraft: (description: string) => void;
}

/** Step 1: the owner's one or two sentences. Checked in the browser with the server's schema, then drafted. */
export function DescribeStep({ initial, focusField, busy, formError, onDraft }: DescribeStepProps) {
  const [description, setDescription] = useState(initial);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (focusField) document.getElementById(FIELD_ID)?.focus();
  }, [focusField]);

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (busy) return;
    const parsed = DraftRequestSchema.safeParse({ description });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? null);
      requestAnimationFrame(() => shakeAndFocus(FIELD_ID));
      return;
    }
    onDraft(parsed.data.description);
  };

  return (
    <form noValidate onSubmit={handleSubmit} className="flex flex-col gap-4">
      <TextAreaField
        id={FIELD_ID}
        label="What do you need help with?"
        hint="One or two sentences is enough."
        placeholder="Help sorting stock and serving customers on Saturday"
        value={description}
        error={error}
        maxLength={300}
        onChange={(event) => {
          setDescription(event.target.value);
          setError(null);
        }}
      />
      <div className="flex flex-col gap-3">
        <Button type="submit" busy={busy} busyLabel="Drafting your tryout" aria-describedby={FORM_ERROR_ID}>
          Draft my tryout
        </Button>
        <FormError id={FORM_ERROR_ID} message={formError} />
        {busy ? <AiGuide /> : null}
      </div>
    </form>
  );
}
