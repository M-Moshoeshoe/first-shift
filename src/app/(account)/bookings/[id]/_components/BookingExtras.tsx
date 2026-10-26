"use client";

import { lazy, Suspense, useState } from "react";
import { Button } from "@/components/ui/Button";
import { BOOKING_COPY } from "@/domain/bookingMessages";
import type { BookingViewResponse } from "@/schemas/booking";

// Each panel's code loads on the tap that opens it, so the booking page stays inside its budget (docs/DESIGN.md, Performance).
const ReportForm = lazy(() => import("./ReportForm").then((module) => ({ default: module.ReportForm })));
const CancelPanel = lazy(() => import("./CancelPanel").then((module) => ({ default: module.CancelPanel })));

const loading = <div role="status" aria-label="Loading" className="h-11 skeleton" />;

/** Report a problem and Cancel this tryout: one button each, and the form behind it once tapped. */
export function BookingExtras({ booking, reload }: { booking: BookingViewResponse; reload: () => void }) {
  const [open, setOpen] = useState<"report" | "cancel" | null>(null);
  return (
    <>
      {/* On every booking, before, during and after the day: the scam rules send people here (docs/RULES.md). */}
      {open === "report" ? (
        <Suspense fallback={loading}>
          <ReportForm bookingId={booking.id} party={booking.party} startOpen />
        </Suspense>
      ) : (
        <Button variant="secondary" onClick={() => setOpen("report")}>
          {BOOKING_COPY.report}
        </Button>
      )}
      {booking.cancel ? (
        open === "cancel" ? (
          <Suspense fallback={loading}>
            <CancelPanel bookingId={booking.id} cancel={booking.cancel} onCancelled={reload} startConfirming />
          </Suspense>
        ) : (
          <Button variant="stop" onClick={() => setOpen("cancel")}>
            {BOOKING_COPY.cancel}
          </Button>
        )
      ) : null}
    </>
  );
}
