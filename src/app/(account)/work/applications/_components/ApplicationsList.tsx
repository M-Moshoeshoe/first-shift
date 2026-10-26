"use client";

import { SlipSkeleton } from "@/components/SlipSkeleton";
import { Button } from "@/components/ui/Button";
import { Collapsible } from "@/components/ui/Collapsible";
import { FormError } from "@/components/ui/FormError";
import { PageTitle } from "@/components/ui/PageTitle";
import { APPLICATIONS_COPY } from "@/domain/bookingMessages";
import { BUTTON_LABELS } from "@/domain/buttonLabels";
import { useApi } from "@/lib/useApi";
import { useHeadingFocus } from "@/lib/useHeadingFocus";
import { ApplicationsSchema } from "@/schemas/booking";
import { ApplicationRow } from "./ApplicationRow";
import { JobOfferCard } from "./JobOfferCard";

/** Still in play: shown open; the rest fold under Past. */
const OPEN: ReadonlySet<string> = new Set(["applied", "offered", "booked"]);

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
        [
          { title: APPLICATIONS_COPY.open, group: resource.data.items.filter((item) => OPEN.has(item.status)), open: true },
          { title: APPLICATIONS_COPY.past, group: resource.data.items.filter((item) => !OPEN.has(item.status)), open: false },
        ].map(({ title, group, open }) =>
          group.length > 0 ? (
            <Collapsible key={title} title={title} count={group.length} open={open}>
              <ul className="flex flex-col gap-2">
                {group.map((item) => (
                  <li key={item.tryoutId}>
                    <ApplicationRow item={item} />
                  </li>
                ))}
              </ul>
            </Collapsible>
          ) : null,
        )
      )}
    </>
  );
}
