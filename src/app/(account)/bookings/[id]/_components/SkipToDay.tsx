"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { FormError } from "@/components/ui/FormError";
import { DEMO_COPY } from "@/domain/demoCopy";
import { ApiError, apiPost } from "@/lib/api";
import { SkipResultSchema } from "@/schemas/booking";

const ERROR_ID = "skip-error";

/** Demo bookings only, before the door opens: moves the day to now, so a judge can try check-in, pay and the reference at any hour. */
export function SkipToDay({ bookingId, onSkipped }: { bookingId: string; onSkipped: () => void }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const skip = async () => {
    setBusy(true);
    setError(null);
    try {
      await apiPost(`/api/bookings/${encodeURIComponent(bookingId)}/skip-to-day`, {}, SkipResultSchema);
      onSkipped();
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : DEMO_COPY.skipFailed);
      setBusy(false);
    }
  };

  return (
    <section aria-label={DEMO_COPY.skip} className="flex flex-col gap-3 border-2 border-ink p-4">
      <p className="text-lg">{DEMO_COPY.skipHint}</p>
      <Button variant="secondary" busy={busy} busyLabel={DEMO_COPY.skipBusy} aria-describedby={ERROR_ID} onClick={() => void skip()}>
        {DEMO_COPY.skip}
      </Button>
      <FormError id={ERROR_ID} message={error} />
    </section>
  );
}
