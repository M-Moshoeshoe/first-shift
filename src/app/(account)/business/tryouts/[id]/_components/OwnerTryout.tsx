"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { lazy, Suspense, useEffect, useState } from "react";
import { ShiftSlip } from "@/components/ShiftSlip";
import { SlipSkeleton } from "@/components/SlipSkeleton";
import { Button } from "@/components/ui/Button";
import { FormError } from "@/components/ui/FormError";
import { Collapsible } from "@/components/ui/Collapsible";
import { PageTitle } from "@/components/ui/PageTitle";
import { BUTTON_LABELS } from "@/domain/buttonLabels";
import { OWNER_COPY } from "@/domain/bookingMessages";
import { sastSlot, sastWhen } from "@/domain/time";
import { ApiError, apiPost } from "@/lib/api";
import { toast } from "@/lib/toast";
import { useApi } from "@/lib/useApi";
import { useHeadingFocus } from "@/lib/useHeadingFocus";
import { OfferResultSchema, OwnerTryoutSchema, SeenResultSchema, type ApplicantResponse } from "@/schemas/booking";
import { STATUS_LINE } from "../../../_components/ownTryouts";
import { ApplicantRow } from "./ApplicantRow";
import { BookedPanel } from "./BookedPanel";

const FALLBACK = `This tryout did not load. Check your connection, then tap ${BUTTON_LABELS.tryAgain}.`;

// React Aria loads after the page has drawn, in idle time, as on the dashboard (TryoutList.tsx).
const loadSheet = () => import("./ApplicantSheet");
const ApplicantSheet = lazy(() => loadSheet().then((module) => ({ default: module.ApplicantSheet })));

/** Everyone else starts folded once the list is long, so the shortlist stays the focus. */
const FOLD_OTHERS_AFTER = 5;

/** The owner's tryout: its slip, any offer waiting or the booking, and the applicants ranked, each with one action. */
export function OwnerTryout() {
  const { id } = useParams<{ id: string }>();
  const { resource, reload } = useApi(`/api/tryouts/${encodeURIComponent(id)}/applicants`, OwnerTryoutSchema, FALLBACK);
  const [offering, setOffering] = useState<string | null>(null);
  const [open, setOpen] = useState<string | null>(null);
  // The last applicant opened stays in the sheet while it closes, so sheet-exit has something to move.
  const [shown, setShown] = useState<string | null>(null);
  const [sheetReady, setSheetReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const heading = useHeadingFocus(resource.status === "ready");

  useEffect(() => {
    const preload = () => void loadSheet().then(() => setSheetReady(true));
    if (typeof requestIdleCallback === "function") {
      const handle = requestIdleCallback(preload);
      return () => cancelIdleCallback(handle);
    }
    const handle = setTimeout(preload, 1);
    return () => clearTimeout(handle);
  }, []);

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
      toast("Offer sent");
      setOpen(null);
      reload();
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : FALLBACK);
    }
    setOffering(null);
  };
  const shortlist = applicants.filter((applicant) => applicant.shortlisted);
  const others = applicants.filter((applicant) => !applicant.shortlisted);
  const rankOf = new Map(applicants.map((applicant, index) => [applicant.workerId, index + 1]));
  const opened = applicants.find((applicant) => applicant.workerId === shown) ?? null;
  const openSheet = (workerId: string) => {
    setError(null);
    setShown(workerId);
    setOpen(workerId);
  };
  const closeSheet = () => {
    setOpen(null);
    setError(null);
  };

  return (
    <>
      <Link href="/business" className="flex min-h-11 items-center self-start underline underline-offset-4">
        Back to your tryouts
      </Link>
      <PageTitle headingRef={heading} title={tryout.title} intro={STATUS_LINE[tryout.status]} />
      <ShiftSlip day={day} hours={hours} business={tryout.title} area={tryout.area} payCents={tryout.payCents} />
      {bookingId ? <BookedPanel bookingId={bookingId} name={booked} /> : null}
      {offer ? <p className="text-base font-semibold">{OWNER_COPY.offered(offer.firstName, sastWhen(new Date(offer.lapsesAt)))}</p> : null}
      {open ? null : <FormError message={error} />}
      {bookingId ? null : (
        <section aria-labelledby="applicants-heading" className="flex flex-col gap-4">
          <h2 id="applicants-heading" className="text-xl font-bold">
            {OWNER_COPY.applicantsTitle}
          </h2>
          {applicants.length === 0 ? <p className="text-base">{OWNER_COPY.noApplicants}</p> : <p className="text-sm text-muted">{OWNER_COPY.fitNote}</p>}
          {[
            { title: OWNER_COPY.shortlist, group: shortlist, folded: false },
            { title: OWNER_COPY.others, group: others, folded: others.length > FOLD_OTHERS_AFTER },
          ].map(({ title, group, folded }) =>
            group.length > 0 ? (
              <Collapsible key={title} title={title} count={group.length} open={!folded}>
                <ol className="flex flex-col gap-2">
                  {group.map((applicant: ApplicantResponse) => (
                    <li key={applicant.workerId}>
                      <ApplicantRow applicant={applicant} rank={rankOf.get(applicant.workerId) ?? 0} onOpen={() => openSheet(applicant.workerId)} />
                    </li>
                  ))}
                </ol>
              </Collapsible>
            ) : null,
          )}
        </section>
      )}
      {/* Kept mounted once loaded, so closing plays sheet-exit instead of vanishing. */}
      {sheetReady || open ? (
        <Suspense fallback={null}>
          <ApplicantSheet isOpen={open !== null} applicant={opened} canOffer={canOffer} busy={offering !== null} error={open ? error : null} onOffer={(workerId) => void makeOffer(workerId)} onClose={closeSheet} />
        </Suspense>
      ) : null}
    </>
  );
}
