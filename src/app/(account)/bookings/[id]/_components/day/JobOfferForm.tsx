"use client";

import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/Button";
import { FormError } from "@/components/ui/FormError";
import { RadioGroup } from "@/components/ui/RadioGroup";
import { TextAreaField } from "@/components/ui/TextAreaField";
import { TextField } from "@/components/ui/TextField";
import { RULES } from "@/config/rules";
import { HIRE_COPY } from "@/domain/recordCopy";
import { parseRand } from "@/domain/money";
import { ApiError, apiPost } from "@/lib/api";
import { HireViewSchema, type HireViewResponse } from "@/schemas/record";

const ERROR_ID = "job-offer-error";
const NOT_SENT = "The job offer was not recorded. Check your connection, then tap Record it again.";
const KIND_OPTIONS = [
  { value: "talk", label: HIRE_COPY.talk },
  { value: "offer", label: HIRE_COPY.offerJob },
] as const;

/**
 * The owner chooses: invite them to talk about a job, or offer one with the
 * role, days a week and hourly pay. The server checks the pay against the
 * minimum wage whatever this form sends (domain/hire.ts).
 */
export function JobOfferForm({ path, done }: { path: string; done: (view: HireViewResponse) => void }) {
  const [kind, setKind] = useState<"talk" | "offer">("talk");
  const [role, setRole] = useState("");
  const [days, setDays] = useState("5");
  const [rate, setRate] = useState((RULES.minimumWageCentsPerHour / 100).toFixed(2));
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    const rateCents = parseRand(rate);
    if (kind === "offer" && (rateCents === null || rateCents < RULES.minimumWageCentsPerHour)) return setError(HIRE_COPY.problems.below_minimum_wage);
    const body = kind === "talk" ? { kind, message } : { kind, message, role, daysPerWeek: Number(days), rateCentsPerHour: rateCents ?? 0 };
    setBusy(true);
    try {
      done(await apiPost(path, body, HireViewSchema));
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : NOT_SENT);
      setBusy(false);
    }
  };

  return (
    <form noValidate onSubmit={(event) => void submit(event)} className="flex flex-col gap-4">
      <RadioGroup id="job-kind" legend={HIRE_COPY.kindLabel} options={KIND_OPTIONS} value={kind} onChange={setKind} />
      {kind === "offer" ? (
        <>
          <TextField id="job-role" label={HIRE_COPY.role} hint={HIRE_COPY.roleHint} value={role} maxLength={RULES.jobRoleMaxChars} onChange={(event) => setRole(event.target.value)} />
          <TextField id="job-days" label={HIRE_COPY.days} type="number" inputMode="numeric" min={1} max={RULES.jobDaysPerWeekMax} value={days} onChange={(event) => setDays(event.target.value)} />
          <TextField id="job-rate" label={HIRE_COPY.rate} hint={HIRE_COPY.rateHint} inputMode="decimal" value={rate} onChange={(event) => setRate(event.target.value)} />
        </>
      ) : null}
      <TextAreaField id="job-message" label={HIRE_COPY.messageLabel} maxLength={RULES.jobMessageMaxChars} value={message} onChange={(event) => setMessage(event.target.value)} />
      <p className="text-sm text-muted">{HIRE_COPY.eti}</p>
      <div className="flex flex-col gap-3">
        <Button type="submit" variant="secondary" busy={busy} busyLabel={HIRE_COPY.recording} aria-describedby={ERROR_ID}>
          {HIRE_COPY.record}
        </Button>
        <FormError id={ERROR_ID} message={error} />
      </div>
    </form>
  );
}
