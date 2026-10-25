"use client";

import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/Button";
import { FormError } from "@/components/ui/FormError";
import { RadioGroup } from "@/components/ui/RadioGroup";
import { TextAreaField } from "@/components/ui/TextAreaField";
import { BOOKING_COPY, REPORT_COPY, REPORT_LABELS } from "@/domain/bookingMessages";
import { REPORT_CATEGORIES, type ReportCategory } from "@/domain/cases";
import { ApiError, apiPost } from "@/lib/api";
import { shakeAndFocus } from "@/lib/forms";
import { ReportResultSchema } from "@/schemas/booking";

const OPTIONS = REPORT_CATEGORIES.map((value) => ({ value, label: REPORT_LABELS[value] }));
const ERROR_ID = "report-error";

/** Report a problem, on every booking: a kind, an optional note, and what happens next. Opened with one tap so it never crowds the page. */
export function ReportForm({ bookingId }: { bookingId: string }) {
  const [open, setOpen] = useState(false);
  const [category, setCategory] = useState<ReportCategory | undefined>(undefined);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState<string | null>(null);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (busy) return;
    if (!category) {
      setError("Choose what happened.");
      requestAnimationFrame(() => shakeAndFocus("report-category"));
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const result = await apiPost(`/api/bookings/${encodeURIComponent(bookingId)}/report`, { category, note }, ReportResultSchema);
      setSent(result.paused ? REPORT_COPY.sentPaused : REPORT_COPY.sent);
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : BOOKING_COPY.notFound);
    }
    setBusy(false);
  };

  if (sent) return <p className="text-lg font-bold text-go">{sent}</p>;
  if (!open) {
    return (
      <Button variant="secondary" onClick={() => setOpen(true)}>
        {BOOKING_COPY.report}
      </Button>
    );
  }
  return (
    <form noValidate onSubmit={(event) => void submit(event)} aria-label={BOOKING_COPY.report} className="flex flex-col gap-4 border-2 border-ink p-4">
      <p className="text-lg font-bold">{REPORT_COPY.emergency}</p>
      <RadioGroup id="report-category" legend={REPORT_COPY.legend} options={OPTIONS} value={category} onChange={setCategory} />
      <TextAreaField id="report-note" label={REPORT_COPY.note} hint={REPORT_COPY.noteHint} maxLength={1000} value={note} onChange={(event) => setNote(event.target.value)} />
      <div className="flex flex-col gap-3">
        <Button type="submit" variant="secondary" busy={busy} busyLabel="Sending" aria-describedby={ERROR_ID}>
          {REPORT_COPY.send}
        </Button>
        <FormError id={ERROR_ID} message={error} />
      </div>
    </form>
  );
}
