"use client";

import { lazy, Suspense } from "react";
import { Stamp } from "@/components/ui/Stamp";
import { DAY_COPY, EVIDENCE_COPY } from "@/domain/dayMessages";
import { METHOD_LABELS } from "@/domain/paymentMethodCopy";
import { sastClock } from "@/domain/time";
import type { BookingViewResponse } from "@/schemas/booking";
import { BalanceCheck } from "./BalanceCheck";
import { CheckInForm } from "./CheckInForm";
import { CheckOutForm } from "./CheckOutForm";
import { ConfirmPayment } from "./ConfirmPayment";
import { ConfirmStep } from "./ConfirmStep";
import { HirePanel } from "./HirePanel";
import { PayForm } from "./PayForm";
import { ReferencePanel } from "./ReferencePanel";
import { BOOKING_NOT_FOUND } from "@/domain/bookingMessages";

// Proof is asked for only in a dispute, so its form and the resizing code load only then.
const EvidenceForm = lazy(() => import("./EvidenceForm").then((module) => ({ default: module.EvidenceForm })));


/** After Not received, either side: add their screenshot once, or see it's been sent. */
function Proof({ booking, reload }: { booking: BookingViewResponse; reload: () => void }) {
  const { evidence } = booking.day;
  if (evidence.sent) return <p className="text-base">{EVIDENCE_COPY.sent}</p>;
  if (!evidence.canAdd) return null;
  return (
    <Suspense fallback={<div role="status" aria-label="Loading" className="h-44 skeleton" />}>
      <EvidenceForm bookingId={booking.id} done={reload} />
    </Suspense>
  );
}

/** The young person's pay: waiting, then what the owner says they sent, checked against their real balance, then Received. */
function WorkerPay({ booking, reload }: { booking: BookingViewResponse; reload: () => void }) {
  const { day } = booking;
  const payment = day.payment;
  const paid = payment?.amountCents ?? day.owedCents;
  return (
    <div className="flex flex-col gap-3 border border-line p-4">
      <h2 className="text-xl font-bold">{DAY_COPY.workerTitle}</h2>
      {payment?.state === "awaiting_payment" ? <p className="text-base tabular-nums">{DAY_COPY.workerWaiting(day.owedCents)}</p> : null}
      {payment?.state === "awaiting_confirmation" ? (
        <>
          {day.remind ? <p className="text-base font-semibold">{DAY_COPY.reminder(booking.businessName)}</p> : null}
          <p className="text-base tabular-nums">{DAY_COPY.workerPaid(booking.businessName, paid, payment.method ? METHOD_LABELS[payment.method] : "")}</p>
          {payment.reference ? <p className="text-base">{DAY_COPY.workerReference(payment.reference)}</p> : null}
          {paid > day.owedCents ? <p className="text-base">{DAY_COPY.overpaid(day.owedCents)}</p> : null}
          <BalanceCheck method={payment.method} />
          <ConfirmPayment bookingId={booking.id} done={reload} />
        </>
      ) : null}
      {payment?.state === "received" ? (
        <>
          <span className="self-start">
            <Stamp label="Received" />
          </span>
          <p className="text-base">{DAY_COPY.receivedDone}</p>
        </>
      ) : null}
      {payment?.state === "not_received" ? <p className="text-base">{DAY_COPY.notReceivedDone}</p> : null}
      <p className="text-sm text-muted">{DAY_COPY.neverSendBack}</p>
    </div>
  );
}

/**
 * The day on the booking page, for whichever side is looking: the door,
 * check-out, paying, confirming, and after Received the reference and, for
 * the owner, a job offer when it's due. Loaded only once the day has started,
 * so the booking page stays light. Each step reloads the booking.
 */
export function DayPanel({ booking, reload }: { booking: BookingViewResponse; reload: () => void }) {
  const { day } = booking;
  const path = (step: string) => `/api/bookings/${encodeURIComponent(booking.id)}/${step}`;
  const checkedIn = day.checkedInAt ? <p className="text-base font-semibold text-go">{DAY_COPY.checkedIn(sastClock(new Date(day.checkedInAt)))}</p> : null;
  const payment = day.payment;

  if (booking.party === "business") {
    return (
      <section aria-label="The day" className="flex flex-col gap-4">
        {day.canCheckIn && day.door ? <CheckInForm bookingId={booking.id} name={booking.workerFirstName} lastFour={day.door.lastFour} done={reload} /> : null}
        {day.canNoShow ? <ConfirmStep path={path("no-show")} label={DAY_COPY.noShow(booking.workerFirstName)} explain={DAY_COPY.noShowConfirm(booking.workerFirstName)} yes={DAY_COPY.noShowYes} fallback={BOOKING_NOT_FOUND} done={reload} /> : null}
        {booking.status === "no_show" ? <p className="text-base">{DAY_COPY.noShowDone}</p> : null}
        {checkedIn}
        {day.canCheckOut ? <CheckOutForm bookingId={booking.id} name={booking.workerFirstName} done={reload} /> : null}
        {day.payable && payment?.state === "awaiting_payment" ? (
          <>
            <p className="text-xl font-semibold tabular-nums">{DAY_COPY.owe(booking.workerFirstName, day.owedCents)}</p>
            <PayForm bookingId={booking.id} name={booking.workerFirstName} phone={booking.payoutPhone ?? ""} methods={day.payMethods} owedCents={day.owedCents} minimumCents={day.owedMinimumCents} done={reload} />
          </>
        ) : null}
        {payment && payment.state !== "awaiting_payment" ? (
          <div className="flex flex-col gap-3">
            {/* "Paid" lands only once the young person confirms it: never on a payment that is waiting or disputed. */}
            {payment.state === "received" ? (
              <span className="self-start">
                <Stamp label="Paid" />
              </span>
            ) : null}
            {payment.state === "awaiting_confirmation" ? <p className="text-base">{DAY_COPY.waitingAnswer(booking.workerFirstName)}</p> : null}
            {payment.state === "awaiting_confirmation" && payment.method === "cash" ? <p className="text-base">{DAY_COPY.cashHandover(booking.workerFirstName)}</p> : null}
            {payment.state === "not_received" ? <p className="text-base">{DAY_COPY.notReceivedDone}</p> : null}
          </div>
        ) : null}
        <Proof booking={booking} reload={reload} />
        {payment?.state === "received" ? <ReferencePanel bookingId={booking.id} /> : null}
        {booking.status === "ended" ? <HirePanel bookingId={booking.id} name={booking.workerFirstName} /> : null}
      </section>
    );
  }

  return (
    <section aria-label="The day" className="flex flex-col gap-4">
      {checkedIn}
      {day.canReportNotOpen ? <ConfirmStep path={path("not-open")} label={DAY_COPY.notOpen} explain={DAY_COPY.notOpenConfirm} yes={DAY_COPY.notOpenYes} fallback={BOOKING_NOT_FOUND} done={reload} /> : null}
      {day.payable ? <WorkerPay booking={booking} reload={reload} /> : null}
      <Proof booking={booking} reload={reload} />
      {day.payment?.state === "received" ? <ReferencePanel bookingId={booking.id} /> : null}
    </section>
  );
}
