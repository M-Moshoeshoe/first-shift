"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/Button";
import { FormError } from "@/components/ui/FormError";
import { RadioGroup } from "@/components/ui/RadioGroup";
import { TextAreaField } from "@/components/ui/TextAreaField";
import { BOOKING_COPY, REPORT_COPY, REPORT_LABELS } from "@/domain/bookingMessages";
import { reportCategoriesFor, type ReportCategory } from "@/domain/cases";
import { ApiError, apiPost } from "@/lib/api";
import { shakeAndFocus } from "@/lib/forms";
import { ReportResultSchema } from "@/schemas/booking";

const ERROR_ID = "report-error";

/** Report a problem, on every booking: a kind (each side has its own), an optional note, and what happens next. Opened with one tap so it never crowds the page. */
export function ReportForm({ bookingId, party }: { bookingId: string; party: "business" | "young_person" }) {
  const options = reportCategoriesFor(party).map((value) => ({ value, label: REPORT_LABELS[value] }));
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
      setError(REPORT_COPY.categoryMissing);
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

  if (sent) return <p className="text-base font-semibold text-go">{sent}</p>;
  if (!open) {
    return (
      <Button variant="secondary" onClick={() => setOpen(true)}>
        {BOOKING_COPY.report}
      </Button>
    );
  }
  return (
    <form noValidate onSubmit={(event) => void submit(event)} aria-label={BOOKING_COPY.report} className="flex flex-col gap-4 border border-line p-4">
      <p className="text-base font-semibold">{REPORT_COPY.emergency}</p>
      <Link href="/safety" className="inline-flex min-h-11 items-center self-start underline underline-offset-4">
        {REPORT_COPY.safetyLink}
      </Link>
      <RadioGroup id="report-category" legend={REPORT_COPY.legend} options={options} value={category} onChange={setCategory} />
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
