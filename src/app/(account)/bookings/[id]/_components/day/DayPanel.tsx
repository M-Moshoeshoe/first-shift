"use client";

import { Stamp } from "@/components/ui/Stamp";
import { DAY_COPY, METHOD_LABELS } from "@/domain/dayMessages";
import { sastClock } from "@/domain/time";
import type { BookingViewResponse } from "@/schemas/booking";
import { CheckInForm } from "./CheckInForm";
import { CheckOutForm } from "./CheckOutForm";
import { ConfirmPayment } from "./ConfirmPayment";
import { ConfirmStep } from "./ConfirmStep";
import { PayForm } from "./PayForm";

const NOT_FOUND = "We can't find that booking. Go back and check your tryouts.";

/**
 * The day on the booking page, for whichever side is looking: the door,
 * check-out, paying, and confirming. Loaded only once the day has started,
 * so the booking page stays light. Each step reloads the booking.
 */
export function DayPanel({ booking, reload }: { booking: BookingViewResponse; reload: () => void }) {
  const { day } = booking;
  const path = (step: string) => `/api/bookings/${encodeURIComponent(booking.id)}/${step}`;
  const checkedIn = day.checkedInAt ? <p className="text-lg font-bold text-go">{DAY_COPY.checkedIn(sastClock(new Date(day.checkedInAt)))}</p> : null;
  const payment = day.payment;
  const paidBy = payment?.method ? METHOD_LABELS[payment.method] : "";

  if (booking.party === "business") {
    return (
      <section aria-label="The day" className="flex flex-col gap-4">
        {day.canCheckIn && day.door ? <CheckInForm bookingId={booking.id} name={booking.workerFirstName} lastFour={day.door.lastFour} done={reload} /> : null}
        {day.canNoShow ? <ConfirmStep path={path("no-show")} label={DAY_COPY.noShow(booking.workerFirstName)} explain={DAY_COPY.noShowConfirm(booking.workerFirstName)} yes={DAY_COPY.noShowYes} fallback={NOT_FOUND} done={reload} /> : null}
        {booking.status === "no_show" ? <p className="text-lg">{DAY_COPY.noShowDone}</p> : null}
        {checkedIn}
        {day.canCheckOut ? <CheckOutForm bookingId={booking.id} name={booking.workerFirstName} done={reload} /> : null}
        {day.payable && payment?.state === "awaiting_payment" ? (
          <>
            <p className="text-xl font-bold tabular-nums">{DAY_COPY.owe(booking.workerFirstName, day.owedCents)}</p>
            <PayForm bookingId={booking.id} owedCents={day.owedCents} minimumCents={day.owedMinimumCents} done={reload} />
          </>
        ) : null}
        {payment && payment.state !== "awaiting_payment" ? (
          <div className="flex flex-col gap-3">
            <span className="self-start">
              <Stamp label={payment.state === "received" ? "Received" : "Paid"} />
            </span>
            {payment.state === "awaiting_confirmation" ? <p className="text-lg">{DAY_COPY.waitingAnswer(booking.workerFirstName)}</p> : null}
            {payment.state === "not_received" ? <p className="text-lg">{DAY_COPY.notReceivedDone}</p> : null}
          </div>
        ) : null}
      </section>
    );
  }

  return (
    <section aria-label="The day" className="flex flex-col gap-4">
      {checkedIn}
      {day.canReportNotOpen ? <ConfirmStep path={path("not-open")} label={DAY_COPY.notOpen} explain={DAY_COPY.notOpenConfirm} yes={DAY_COPY.notOpenYes} fallback={NOT_FOUND} done={reload} /> : null}
      {day.payable ? (
        <div className="flex flex-col gap-3 border-2 border-ink p-4">
          <h2 className="text-xl font-bold">{DAY_COPY.workerTitle}</h2>
          {payment?.state === "awaiting_payment" ? <p className="text-lg tabular-nums">{DAY_COPY.workerWaiting(day.owedCents)}</p> : null}
          {payment?.state === "awaiting_confirmation" ? (
            <>
              {day.remind ? <p className="text-lg font-bold">{DAY_COPY.reminder(booking.businessName)}</p> : null}
              <p className="text-lg tabular-nums">{DAY_COPY.workerPaid(booking.businessName, payment.amountCents ?? day.owedCents, paidBy)}</p>
              <ConfirmPayment bookingId={booking.id} done={reload} />
            </>
          ) : null}
          {payment?.state === "received" ? (
            <>
              <span className="self-start">
                <Stamp label="Received" />
              </span>
              <p className="text-lg">{DAY_COPY.receivedDone}</p>
            </>
          ) : null}
          {payment?.state === "not_received" ? <p className="text-lg">{DAY_COPY.notReceivedDone}</p> : null}
        </div>
      ) : null}
    </section>
  );
}
