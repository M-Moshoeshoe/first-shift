"use client";

import { useState, type FormEvent } from "react";
import { BUTTON_LABELS } from "@/domain/buttonLabels";
import { Button } from "@/components/ui/Button";
import { CheckboxField } from "@/components/ui/CheckboxField";
import { FormError } from "@/components/ui/FormError";
import { TextField } from "@/components/ui/TextField";
import { RULES } from "@/config/rules";
import { formatRand } from "@/domain/money";
import { sastDateKey } from "@/domain/time";
import { firstInvalid, shakeAndFocus } from "@/lib/forms";
import { useHeadingFocus } from "@/lib/useHeadingFocus";
import type { PostTryoutInput } from "@/schemas/tryout";
import { CHECK_FIELDS, checkForm, dayPay, SUGGESTED_TASKS, type CheckDraft, type CheckErrors, type CheckField } from "./checkForm";
import { HoursField } from "./HoursField";
import { TaskListField } from "./TaskListField";
import { DraftOptions, type DraftOption } from "./DraftOptions";
import { AiMark } from "@/components/AiMark";
import { Collapsible } from "@/components/ui/Collapsible";
import { AI_COPY } from "@/domain/tryoutMessages";

const fieldId = (field: CheckField) => `post-${field}`;
const FORM_ERROR_ID = "post-check-error";
const minimumRate = formatRand(RULES.minimumWageCentsPerHour);

interface CheckStepProps {
  initial: CheckDraft;
  /** The AI's versions; more than one shows them as choices above the fields. */
  options: readonly DraftOption[];
  description: string;
  busy: boolean;
  /** A refusal from the server, shown under the button. */
  formError: string | null;
  onPost: (input: PostTryoutInput, form: CheckDraft) => void;
  onBack: (form: CheckDraft) => void;
}

/**
 * Step 2: the drafted tryout, every part editable. The same domain checks as
 * the server give instant feedback next to each field, and the day's pay
 * updates as the rate or hours change. The server checks it all again.
 */
export function CheckStep({ initial, options, description, busy, formError, onPost, onBack }: CheckStepProps) {
  const [form, setForm] = useState(initial);
  const [chosen, setChosen] = useState(0);
  const [errors, setErrors] = useState<CheckErrors>({});
  const heading = useHeadingFocus(true);
  const pay = dayPay(form);

  const update = <K extends keyof CheckDraft>(field: K, value: CheckDraft[K]) => {
    setForm((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: undefined }));
  };

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (busy) return;
    const checked = checkForm(form, description, new Date());
    if (checked.input) return onPost(checked.input, form);
    setErrors(checked.errors);
    const first = firstInvalid(checked.errors, CHECK_FIELDS);
    if (!first) return;
    // A folded section can't show its field: open it first.
    const details = document.getElementById(fieldId(first))?.closest("details");
    if (details) details.open = true;
    requestAnimationFrame(() => shakeAndFocus(fieldId(first)));
  };

  return (
    <form noValidate onSubmit={handleSubmit} className="flex flex-col gap-4">
      <h2 ref={heading} tabIndex={-1} className="text-xl font-bold">
        Check your tryout
      </h2>
      {/* What the AI did and what our rules decided, so nobody mistakes the draft for the decision. */}
      <section aria-label={AI_COPY.assist} className="flex flex-col gap-1 border border-line bg-mist p-3">
        <AiMark>{AI_COPY.checked}</AiMark>
        <p className="text-sm">{AI_COPY.did}</p>
        <p className="text-sm text-muted">{AI_COPY.enforced}</p>
      </section>
      {options.length > 1 ? (
        <DraftOptions
          options={options}
          chosen={chosen}
          onChoose={(index) => {
            const option = options[index];
            if (!option) return;
            setChosen(index);
            setForm((current) => ({ ...current, title: option.title, tasks: [...option.tasks].slice(0, SUGGESTED_TASKS) }));
            setErrors({});
          }}
        />
      ) : null}
      <Collapsible title="Tasks" count={form.tasks.length} boxed>
        <TextField id={fieldId("title")} label="Title" maxLength={60} value={form.title} error={errors.title} onChange={(event) => update("title", event.target.value)} />
        <TaskListField id={fieldId("tasks")} tasks={form.tasks} error={errors.tasks} onChange={(tasks) => update("tasks", tasks)} />
      </Collapsible>
      <Collapsible title="Time and pay" boxed>
        <TextField id={fieldId("date")} label="Date" type="date" min={sastDateKey(new Date())} value={form.date} error={errors.date} onChange={(event) => update("date", event.target.value)} />
        <TextField id={fieldId("startTime")} label="Start time" type="time" value={form.startTime} error={errors.startTime} onChange={(event) => update("startTime", event.target.value)} />
        <HoursField id={fieldId("hours")} value={form.hours} error={errors.hours} onChange={(hours) => update("hours", hours)} />
        <TextField
          id={fieldId("rate")}
          label="Pay per hour"
          hint={`At least ${minimumRate}, the national minimum wage. You can pay more.`}
          inputMode="decimal"
          value={form.rate}
          error={errors.rate}
          onChange={(event) => update("rate", event.target.value)}
        />
        <p role="status" className="text-base font-semibold tabular-nums">
          {pay === null ? "" : `Pay for the day: ${formatRand(pay)}`}
        </p>
      </Collapsible>
      <Collapsible title="Supervision" boxed>
        <CheckboxField id={fieldId("supervision")} label="I'll be on site to supervise." checked={form.supervision} error={errors.supervision} onChange={(checked) => update("supervision", checked)} />
      </Collapsible>
      <div className="flex flex-col gap-3">
        <Button type="submit" busy={busy} busyLabel="Checking and posting" aria-describedby={FORM_ERROR_ID}>
          Post tryout
        </Button>
        <Button variant="secondary" disabled={busy} onClick={() => onBack(form)}>
          {BUTTON_LABELS.back}
        </Button>
        <FormError id={FORM_ERROR_ID} message={formError} />
      </div>
    </form>
  );
}
