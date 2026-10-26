"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { ShiftSlip } from "@/components/ShiftSlip";
import { SlipSkeleton } from "@/components/SlipSkeleton";
import { Button } from "@/components/ui/Button";
import { FormError } from "@/components/ui/FormError";
import { PageTitle } from "@/components/ui/PageTitle";
import { BUTTON_LABELS } from "@/domain/buttonLabels";
import { OWNER_COPY } from "@/domain/bookingMessages";
import { sastSlot, sastWhen } from "@/domain/time";
import { ApiError, apiPost } from "@/lib/api";
import { useApi } from "@/lib/useApi";
import { useHeadingFocus } from "@/lib/useHeadingFocus";
import { OfferResultSchema, OwnerTryoutSchema, SeenResultSchema, type ApplicantResponse } from "@/schemas/booking";
import { STATUS_LINE } from "../../../_components/ownTryouts";
import { ApplicantCard } from "./ApplicantCard";
import { BookedPanel } from "./BookedPanel";

const FALLBACK = `This tryout did not load. Check your connection, then tap ${BUTTON_LABELS.tryAgain}.`;

/** The owner's tryout: its slip, any offer waiting or the booking, and the applicants ranked, each with one action. */
export function OwnerTryout() {
  const { id } = useParams<{ id: string }>();
  const { resource, reload } = useApi(`/api/tryouts/${encodeURIComponent(id)}/applicants`, OwnerTryoutSchema, FALLBACK);
  const [offering, setOffering] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const heading = useHeadingFocus(resource.status === "ready");

  // Opening the page counts as seeing the applicants: the nav badge drops them.
  useEffect(() => {
    if (resource.status === "ready") void apiPost(`/api/tryouts/${encodeURIComponent(id)}/seen`, {}, SeenResultSchema).catch(() => undefined);
  }, [resource.status, id]);

  if (resource.status === "loading") {
    return (
      <div role="status" aria-label="Loading your tryout" className="flex flex-col gap-6">
        <div className="h-11 w-2/3 skeleton" />
        <SlipSkeleton />
      </div>
    );
  }
  if (resource.status === "error") {
    return (
      <div className="flex flex-col gap-3">
        <FormError message={resource.message} />
        <Button variant="secondary" onClick={reload}>
          {BUTTON_LABELS.tryAgain}
        </Button>
      </div>
    );
  }

  const { tryout, offer, bookingId, booked, canOffer, applicants } = resource.data;
  const { day, hours } = sastSlot(new Date(tryout.startAt), new Date(tryout.endAt));
  const makeOffer = async (workerId: string) => {
    setOffering(workerId);
    setError(null);
    try {
      await apiPost(`/api/tryouts/${encodeURIComponent(id)}/offer`, { workerId }, OfferResultSchema);
      reload();
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : FALLBACK);
    }
    setOffering(null);
  };
  const shortlist = applicants.filter((applicant) => applicant.shortlisted);
  const others = applicants.filter((applicant) => !applicant.shortlisted);

  return (
    <>
      <Link href="/business" className="flex min-h-11 items-center self-start underline underline-offset-4">
        Back to your tryouts
      </Link>
      <PageTitle headingRef={heading} title={tryout.title} intro={STATUS_LINE[tryout.status]} />
      <ShiftSlip day={day} hours={hours} business={tryout.title} area={tryout.area} payCents={tryout.payCents} />
      {bookingId ? <BookedPanel bookingId={bookingId} name={booked} /> : null}
      {offer ? <p className="text-base font-semibold">{OWNER_COPY.offered(offer.firstName, sastWhen(new Date(offer.lapsesAt)))}</p> : null}
      <FormError message={error} />
      {bookingId ? null : (
        <section aria-labelledby="applicants-heading" className="flex flex-col gap-4">
          <h2 id="applicants-heading" className="text-xl font-bold">
            {OWNER_COPY.applicantsTitle}
          </h2>
          {applicants.length === 0 ? <p className="text-base">{OWNER_COPY.noApplicants}</p> : <p className="text-sm text-muted">{OWNER_COPY.fitNote}</p>}
          {[{ title: OWNER_COPY.shortlist, group: shortlist }, { title: OWNER_COPY.others, group: others }].map(({ title, group }) =>
            group.length > 0 ? (
              <div key={title} className="flex flex-col gap-4">
                <h3 className="text-base font-bold">{title}</h3>
                {group.map((applicant: ApplicantResponse) => (
                  <ApplicantCard key={applicant.workerId} applicant={applicant} canOffer={canOffer} busy={offering === applicant.workerId} onOffer={() => void makeOffer(applicant.workerId)} />
                ))}
              </div>
            ) : null,
          )}
        </section>
      )}
    </>
  );
}
