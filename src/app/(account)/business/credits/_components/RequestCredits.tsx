"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { FormError } from "@/components/ui/FormError";
import { CREDITS_COPY } from "@/domain/creditsCopy";
import { sastDay } from "@/domain/time";
import { ApiError, apiPost } from "@/lib/api";
import { CreditRequestResultSchema } from "@/schemas/credits";

const ERROR_ID = "request-credits-error";

/**
 * "Request more credits", which opens a case for an admin; once sent, the
 * date it was asked and what happens next. The launch prices are text only:
 * there's no payment yet, so there's no button that can't work.
 */
export function RequestCredits({ requestedAt, onRequested }: { requestedAt: string | null; onRequested: (requestedAt: string) => void }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const request = async () => {
    setBusy(true);
    setError(null);
    try {
      onRequested((await apiPost("/api/credits/request", {}, CreditRequestResultSchema)).requestedAt);
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : CREDITS_COPY.unavailable);
    }
    setBusy(false);
  };

  return (
    <section aria-label={CREDITS_COPY.request} className="flex flex-col gap-3 border border-line p-4">
      {requestedAt ? (
        <p role="status" className="text-base font-semibold">
          {CREDITS_COPY.requested(sastDay(new Date(requestedAt)))}
        </p>
      ) : (
        <>
          <Button busy={busy} busyLabel={CREDITS_COPY.requesting} aria-describedby={ERROR_ID} onClick={() => void request()}>
            {CREDITS_COPY.request}
          </Button>
          <FormError id={ERROR_ID} message={error} />
        </>
      )}
    </section>
  );
}
