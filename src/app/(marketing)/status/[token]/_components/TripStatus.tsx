"use client";

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { PageTitle } from "@/components/ui/PageTitle";
import { STATUS_LABELS, STATUS_PAGE_COPY } from "@/domain/bookingStatus";
import { sastSlot } from "@/domain/time";
import { fetchStatus, type StatusResponse } from "@/lib/fetchStatus";

/** First names, the business, the times and the status, read fresh on every visit. Nothing else. */
export function TripStatus() {
  const { token } = useParams<{ token: string }>();
  const [view, setView] = useState<StatusResponse | null | undefined>(undefined);

  useEffect(() => {
    let current = true;
    void fetchStatus(token).then((next) => current && setView(next));
    return () => {
      current = false;
    };
  }, [token]);

  if (view === undefined) return <div role="status" aria-label="Loading the status" className="h-36 skeleton" />;
  if (view === null) return <PageTitle title="Tryout status" intro={STATUS_PAGE_COPY.unavailable} />;
  const { day, hours } = sastSlot(new Date(view.startAt), new Date(view.endAt));
  return (
    <>
      <PageTitle title={STATUS_PAGE_COPY.title(view.workerFirstName)} intro={STATUS_PAGE_COPY.at(view.businessName, view.businessArea)} />
      <dl className="flex flex-col gap-4 text-base">
        <div className="flex flex-col gap-1">
          <dt className="font-semibold">When</dt>
          <dd>
            {day}, {hours}
          </dd>
        </div>
        <div className="flex flex-col gap-1">
          <dt className="font-semibold">Status</dt>
          <dd>{STATUS_LABELS[view.status]}</dd>
        </div>
      </dl>
    </>
  );
}
