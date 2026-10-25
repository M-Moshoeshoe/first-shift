"use client";

import Link from "next/link";
import { useState } from "react";
import { Button, buttonClass } from "@/components/ui/Button";
import { FormError } from "@/components/ui/FormError";
import { OFFER_COPY } from "@/domain/bookingMessages";
import { FINDING_MESSAGES } from "@/domain/findingMessages";
import { sastClock } from "@/domain/time";
import { ApiError, apiPost } from "@/lib/api";
import { AnswerResultSchema } from "@/schemas/booking";
import type { ApplyStateResponse } from "@/schemas/finding";

const ERROR_ID = "offer-error";

type AnsweredState = Extract<ApplyStateResponse, { kind: "offered" | "booked" | "not_selected" }>;

/** After applying: an offer to accept or decline, the booking once accepted, or "not selected". */
export function OfferAnswer({ tryoutId, state, onReload }: { tryoutId: string; state: AnsweredState; onReload: () => void }) {
  const [busy, setBusy] = useState<"accept" | "decline" | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Accepting books it on the server, with every rule checked again; the page then reads its state again.
  const answer = async (choice: "accept" | "decline") => {
    setBusy(choice);
    setError(null);
    try {
      await apiPost(`/api/applications/${encodeURIComponent(tryoutId)}/answer`, { answer: choice }, AnswerResultSchema);
      onReload();
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : FINDING_MESSAGES.detailUnavailable);
      setBusy(null);
    }
  };

  if (state.kind === "not_selected") return <p className="text-lg">{OFFER_COPY.notSelected}</p>;
  if (state.kind === "booked") {
    return (
      <section aria-labelledby="booked-heading" className="flex flex-col gap-3">
        <h2 id="booked-heading" className="text-xl font-bold text-go">
          {OFFER_COPY.booked}
        </h2>
        <Link href={`/bookings/${state.bookingId}`} className={buttonClass("primary")}>
          {OFFER_COPY.seeBooking}
        </Link>
      </section>
    );
  }
  return (
    <section aria-labelledby="offer-heading" className="flex flex-col gap-3">
      <div className="flex flex-col gap-2">
        <h2 id="offer-heading" className="text-xl font-bold">
          {OFFER_COPY.offeredTitle}
        </h2>
        <p className="text-lg">{OFFER_COPY.offered(sastClock(new Date(state.lapsesAt)))}</p>
      </div>
      <Button busy={busy === "accept"} busyLabel="Accepting" aria-describedby={ERROR_ID} onClick={() => void answer("accept")}>
        {OFFER_COPY.accept}
      </Button>
      <Button variant="stop" busy={busy === "decline"} busyLabel="Declining" aria-describedby={ERROR_ID} onClick={() => void answer("decline")}>
        {OFFER_COPY.decline}
      </Button>
      <FormError id={ERROR_ID} message={error} />
    </section>
  );
}
