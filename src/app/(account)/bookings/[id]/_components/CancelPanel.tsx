"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { FormError } from "@/components/ui/FormError";
import { BOOKING_COPY } from "@/domain/bookingMessages";
import { ApiError, apiPost } from "@/lib/api";
import { CancelResultSchema } from "@/schemas/booking";

const ERROR_ID = "cancel-error";

/**
 * Cancel, in two taps: the first says what cancelling now means, as the
 * server classified it (free, or late with what's owed); the second does it.
 * The server classifies it again when it happens.
 */
export function CancelPanel({ bookingId, cancel, onCancelled }: { bookingId: string; cancel: { kind: "free" | "late"; owedCents: number }; onCancelled: () => void }) {
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const confirm = async () => {
    setBusy(true);
    setError(null);
    try {
      await apiPost(`/api/bookings/${encodeURIComponent(bookingId)}/cancel`, {}, CancelResultSchema);
      onCancelled();
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : BOOKING_COPY.notFound);
      setBusy(false);
    }
  };

  if (!confirming) {
    return (
      <Button variant="stop" onClick={() => setConfirming(true)}>
        {BOOKING_COPY.cancel}
      </Button>
    );
  }
  return (
    <section aria-labelledby="cancel-heading" className="flex flex-col gap-3">
      <p id="cancel-heading" className="text-lg font-bold">
        {cancel.kind === "free" ? BOOKING_COPY.cancelFree : BOOKING_COPY.cancelLate(cancel.owedCents)}
      </p>
      <Button variant="stop" busy={busy} busyLabel="Cancelling" aria-describedby={ERROR_ID} onClick={() => void confirm()}>
        {BOOKING_COPY.cancelConfirm}
      </Button>
      <Button variant="secondary" onClick={() => setConfirming(false)}>
        {BOOKING_COPY.keep}
      </Button>
      <FormError id={ERROR_ID} message={error} />
    </section>
  );
}
