"use client";

import Link from "next/link";
import { ShiftSlip } from "@/components/ShiftSlip";
import { SlipSkeleton } from "@/components/SlipSkeleton";
import { Button } from "@/components/ui/Button";
import { FormError } from "@/components/ui/FormError";
import { PageTitle } from "@/components/ui/PageTitle";
import { APPLICATION_LABELS, APPLICATIONS_COPY } from "@/domain/bookingMessages";
import { BUTTON_LABELS } from "@/domain/buttonLabels";
import { sastSlot } from "@/domain/time";
import { useApi } from "@/lib/useApi";
import { useHeadingFocus } from "@/lib/useHeadingFocus";
import { ApplicationsSchema } from "@/schemas/booking";
import { JobOfferCard } from "./JobOfferCard";

const FALLBACK = `Your applications did not load. Check your connection, then tap ${BUTTON_LABELS.tryAgain}.`;

/** Every tryout the young person applied for and where it stands. Each opens the tryout, or the booking once booked. */
export function ApplicationsList() {
  const { resource, reload } = useApi("/api/applications", ApplicationsSchema, FALLBACK);
  const heading = useHeadingFocus(true);

  return (
    <>
      <PageTitle headingRef={heading} title={APPLICATIONS_COPY.title} intro={APPLICATIONS_COPY.intro} />
      {resource.status === "loading" ? (
        <div role="status" aria-label="Loading your applications" className="flex flex-col gap-4">
          <SlipSkeleton />
        </div>
      ) : resource.status === "error" ? (
        <div className="flex flex-col gap-3">
          <FormError message={resource.message} />
          <Button variant="secondary" onClick={reload}>
            {BUTTON_LABELS.tryAgain}
          </Button>
        </div>
      ) : null}
      {resource.status === "ready" && resource.data.jobOffers.length > 0 ? (
        <div className="flex flex-col gap-3">
          {resource.data.jobOffers.map((offer) => (
            <JobOfferCard key={offer.id} offer={offer} onAnswered={reload} />
          ))}
        </div>
      ) : null}
      {resource.status !== "ready" ? null : resource.data.items.length === 0 ? (
        <p className="text-base">{APPLICATIONS_COPY.empty}</p>
      ) : (
        <ul className="flex flex-col gap-4">
          {resource.data.items.map((item) => {
            const { day, hours } = sastSlot(new Date(item.startAt), new Date(item.endAt));
            const label = item.status === "offer_ended" ? APPLICATIONS_COPY.offerEnded : APPLICATION_LABELS[item.status];
            const href = item.bookingId ? `/bookings/${item.bookingId}` : `/work/tryouts/${item.tryoutId}`;
            return (
              <li key={item.tryoutId}>
                <Link href={href} className="block focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-ink">
                  <ShiftSlip
                    day={day}
                    hours={hours}
                    business={item.businessName}
                    area={item.area}
                    payCents={item.payCents}
                    footer={<p className="flex min-h-11 items-center font-semibold underline underline-offset-4">{label}</p>}
                  />
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
