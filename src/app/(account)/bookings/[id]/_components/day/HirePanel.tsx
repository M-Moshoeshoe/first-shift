"use client";

import { useState } from "react";
import { Button, buttonClass } from "@/components/ui/Button";
import { FormError } from "@/components/ui/FormError";
import { HIRE_COPY } from "@/domain/recordCopy";
import { ApiError, apiPost } from "@/lib/api";
import { useApi } from "@/lib/useApi";
import { HireViewSchema } from "@/schemas/record";

const NOT_NOW = "The job offer didn't go through. Check your connection, then try again.";

/**
 * "Offer {name} a job", on the owner's booking once a tryout is done and
 * the pair has worked together enough (hire.ts). Tapping it records the
 * offer, once; then a WhatsApp message, already written, is one tap away,
 * and the owner can change it before sending.
 */
export function HirePanel({ bookingId, name }: { bookingId: string; name: string }) {
  const path = `/api/bookings/${encodeURIComponent(bookingId)}/hire`;
  const { resource, set } = useApi(path, HireViewSchema, NOT_NOW);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  if (resource.status !== "ready") return null;
  const hire = resource.data;
  if (!hire.due && !hire.offered) return null;

  const offer = async () => {
    setBusy(true);
    setError(null);
    try {
      set(await apiPost(path, {}, HireViewSchema));
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : NOT_NOW);
    }
    setBusy(false);
  };

  return (
    <section aria-labelledby="hire-heading" className="flex flex-col gap-3 border-2 border-ink p-4">
      <h2 id="hire-heading" className="text-xl font-bold">
        {HIRE_COPY.offer(name)}
      </h2>
      {hire.offered ? (
        <>
          <p className="text-lg">{HIRE_COPY.offered(name)}</p>
          {hire.whatsappUrl ? (
            <a href={hire.whatsappUrl} target="_blank" rel="noopener noreferrer" className={buttonClass("secondary")}>
              {HIRE_COPY.send}
            </a>
          ) : null}
        </>
      ) : (
        <>
          <p className="text-lg">{HIRE_COPY.why(name)}</p>
          <Button variant="secondary" busy={busy} busyLabel="Recording your offer" onClick={() => void offer()}>
            {HIRE_COPY.offer(name)}
          </Button>
          <FormError message={error} />
        </>
      )}
    </section>
  );
}
