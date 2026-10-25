"use client";

import { useParams } from "next/navigation";
import { lazy, Suspense } from "react";
import { PersonPhoto } from "@/components/PersonPhoto";
import { ShiftSlip } from "@/components/ShiftSlip";
import { SlipSkeleton } from "@/components/SlipSkeleton";
import { Button } from "@/components/ui/Button";
import { FormError } from "@/components/ui/FormError";
import { PageTitle } from "@/components/ui/PageTitle";
import { BOOKING_COPY } from "@/domain/bookingMessages";
import { STATUS_LABELS } from "@/domain/bookingStatus";
import { BUTTON_LABELS } from "@/domain/buttonLabels";
import { sastSlot } from "@/domain/time";
import { useApi } from "@/lib/useApi";
import { useHeadingFocus } from "@/lib/useHeadingFocus";
import { BookingViewSchema, type BookingViewResponse } from "@/schemas/booking";
import { BookingActions } from "./BookingActions";
import { CancelPanel } from "./CancelPanel";
import { ReportForm } from "./ReportForm";

// The day's tools load only once the day has begun (or money is owed), so the booking page stays inside its budget.
const DayPanel = lazy(() => import("./day/DayPanel").then((module) => ({ default: module.DayPanel })));

const FALLBACK = `This booking didn't load. Check your connection, then tap ${BUTTON_LABELS.tryAgain}.`;

/** Whether there's anything for the day panel to show yet. */
const hasDay = ({ day, status }: BookingViewResponse): boolean =>
  day.canCheckIn || day.canNoShow || day.canReportNotOpen || day.canCheckOut || day.payable || day.checkedInAt !== null || status === "no_show";

/** The booking, for either party: when and where, who, and what each can do. The server decides what each side sees. */
export function BookingDetail() {
  const { id } = useParams<{ id: string }>();
  const { resource, reload } = useApi(`/api/bookings/${encodeURIComponent(id)}`, BookingViewSchema, FALLBACK);
  const heading = useHeadingFocus(resource.status === "ready");

  if (resource.status === "loading") {
    return (
      <div role="status" aria-label="Loading your booking" className="flex flex-col gap-6">
        <div className="h-11 w-2/3 animate-skeleton bg-mist" />
        <SlipSkeleton />
      </div>
    );
  }
  if (resource.status === "error") {
    return (
      <div className="flex flex-col gap-3">
        <FormError message={resource.message} />
        {resource.notFound ? null : (
          <Button variant="secondary" onClick={reload}>
            {BUTTON_LABELS.tryAgain}
          </Button>
        )}
      </div>
    );
  }

  const booking = resource.data;
  const { day, hours } = sastSlot(new Date(booking.startAt), new Date(booking.endAt));
  const isOwner = booking.party === "business";
  const other = isOwner ? booking.workerFirstName : booking.businessName;
  return (
    <>
      <PageTitle headingRef={heading} title={booking.title} intro={STATUS_LABELS[booking.status]} />
      <ShiftSlip day={day} hours={hours} business={booking.businessName} area={booking.businessArea} payCents={booking.payCents} stamp={booking.status === "booked" ? "Booked" : undefined} />
      <section aria-labelledby="who-heading" className="flex gap-4">
        <PersonPhoto subject={booking.photo.subject} kind={booking.photo.kind} alt={other} />
        <div className="flex flex-col gap-1">
          <h2 id="who-heading" className="text-xl font-bold">
            {other}
          </h2>
          {isOwner && booking.payoutPhone ? (
            <p className="text-lg tabular-nums">
              {BOOKING_COPY.payoutPhone}: {booking.payoutPhone}
            </p>
          ) : null}
        </div>
      </section>
      <section aria-labelledby="where-heading" className="flex flex-col gap-2">
        <h2 id="where-heading" className="text-xl font-bold">
          {BOOKING_COPY.where}
        </h2>
        <p className="text-lg">
          {booking.businessName}, {booking.businessArea}. {BOOKING_COPY.pin(booking.pinAccuracyMetres)}
        </p>
        <a href={booking.mapsUrl} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center self-start font-bold underline underline-offset-4">
          {BOOKING_COPY.openMaps}
        </a>
      </section>
      {hasDay(booking) ? (
        <Suspense fallback={<div role="status" aria-label="Loading the day" className="h-44 animate-skeleton bg-mist" />}>
          <DayPanel booking={booking} reload={reload} />
        </Suspense>
      ) : null}
      <BookingActions booking={booking} when={`${day}, ${hours}`} />
      {/* On every booking, before, during and after the day: the scam rules send people here (docs/RULES.md). */}
      <ReportForm bookingId={booking.id} party={booking.party} />
      {booking.cancel ? <CancelPanel bookingId={booking.id} cancel={booking.cancel} onCancelled={reload} /> : null}
    </>
  );
}
