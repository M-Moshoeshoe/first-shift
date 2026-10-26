"use client";

import Link from "next/link";
import { SlipSkeleton } from "@/components/SlipSkeleton";
import { Button } from "@/components/ui/Button";
import { FormError } from "@/components/ui/FormError";
import { BUTTON_LABELS } from "@/domain/buttonLabels";
import { FEED_COPY, FINDING_MESSAGES } from "@/domain/findingMessages";
import { useNearbyTryouts } from "@/lib/useNearbyTryouts";
import { FeedSlip } from "./FeedSlip";

const ERROR_ID = "nearby-error";

/**
 * The feed: each tryout a slip that opens its detail page. Refresh fetches
 * again; so does coming back to the page. Tryouts that arrive with a refresh
 * use item-enter; the first list appears at once.
 */
export function NearbyList() {
  const { data, error, loading, fresh, refresh } = useNearbyTryouts();

  if (!data && loading) {
    return (
      <div role="status" aria-label="Loading tryouts near you" className="flex flex-col gap-4">
        <SlipSkeleton />
        <SlipSkeleton />
      </div>
    );
  }

  const actions = (
    <div className="flex flex-col gap-3">
      <Button variant="secondary" busy={loading} busyLabel="Refreshing" aria-describedby={ERROR_ID} onClick={refresh}>
        {BUTTON_LABELS.refresh}
      </Button>
      <FormError id={ERROR_ID} message={error} />
    </div>
  );

  if (!data) return actions;
  if (data.status === "unknown_area") return <FormError message={FINDING_MESSAGES.unknownArea(data.area)} />;

  return (
    <div className="flex flex-col gap-4">
      {data.items.length === 0 ? (
        <div className="flex flex-col gap-2">
          <h3 className="text-base font-bold">{FEED_COPY.emptyTitle}</h3>
          <p className="text-base">{FEED_COPY.empty(data.area)}</p>
        </div>
      ) : (
        <ul className="flex flex-col gap-4">
          {data.items.map((item) => (
            <li key={item.id} className={fresh.has(item.id) ? "animate-item-enter" : undefined}>
              <Link href={`/work/tryouts/${item.id}`} className="block focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-ink">
                <FeedSlip item={item} footer={<p className="flex min-h-11 items-center font-semibold underline underline-offset-4">{item.title}</p>} />
              </Link>
            </li>
          ))}
        </ul>
      )}
      {actions}
    </div>
  );
}
