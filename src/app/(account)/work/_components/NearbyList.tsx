"use client";

import { useState } from "react";
import { SlipSkeleton } from "@/components/SlipSkeleton";
import { Button } from "@/components/ui/Button";
import { FormError } from "@/components/ui/FormError";
import { BUTTON_LABELS } from "@/domain/buttonLabels";
import { FEED_COPY, FINDING_MESSAGES } from "@/domain/findingMessages";
import { FEED_SORT_LABELS, FEED_SORTS, sortFeed, type FeedSort } from "@/domain/feedSort";
import { feedCountLine } from "@/domain/greeting";
import type { NearbyTryouts } from "@/lib/useNearbyTryouts";
import { FeedCard } from "./FeedCard";

const ERROR_ID = "nearby-error";

/**
 * The feed: each tryout a slip that opens its detail page. Refresh fetches
 * again; so does coming back to the page. Tryouts that arrive with a refresh
 * use item-enter; the first list appears at once.
 */
export function NearbyList({ feed }: { feed: NearbyTryouts }) {
  const { data, error, loading, fresh, refresh } = feed;
  const [sort, setSort] = useState<FeedSort>("soonest");

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
        <>
          {/* The summary band shows the count; this line is for screen readers, so a refresh is announced. */}
          <p role="status" className="sr-only">
            {feedCountLine(data.items.length)}
          </p>
          {/* Sorts what is already loaded: no new request, no motion. */}
          {data.items.length > 1 ? (
            <div role="group" aria-label="Sort tryouts" className="flex flex-wrap gap-2">
              {FEED_SORTS.map((option) => (
                <button
                  key={option}
                  type="button"
                  aria-pressed={sort === option}
                  onClick={() => setSort(option)}
                  className="min-h-11 border border-line px-3 text-sm font-semibold aria-pressed:border-ink aria-pressed:bg-ink aria-pressed:text-paper"
                >
                  {FEED_SORT_LABELS[option]}
                </button>
              ))}
            </div>
          ) : null}
          <ul className="flex flex-col gap-2">
            {sortFeed(data.items, sort).map((item) => (
              <li key={item.id} className={fresh.has(item.id) ? "animate-item-enter" : undefined}>
                <FeedCard item={item} />
              </li>
            ))}
          </ul>
        </>
      )}
      {actions}
    </div>
  );
}
