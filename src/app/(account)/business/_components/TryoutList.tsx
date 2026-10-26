"use client";

import Link from "next/link";
import { lazy, Suspense, useEffect, useState } from "react";
import { SlipSkeleton } from "@/components/SlipSkeleton";
import { Button } from "@/components/ui/Button";
import { FormError } from "@/components/ui/FormError";
import { BUTTON_LABELS } from "@/domain/buttonLabels";
import { formatRand } from "@/domain/money";
import { sastSlot } from "@/domain/time";
import type { OwnTryouts } from "@/lib/useOwnTryouts";
import { canWithdraw, orderTryouts, statusLine } from "./ownTryouts";

// React Aria (about 20 KB) loads after the dashboard has drawn, in idle time, so it never delays the
// first screen and is ready before anyone taps Withdraw (docs/DESIGN.md, Performance).
const loadSheet = () => import("./WithdrawSheet");
const WithdrawSheet = lazy(() => loadSheet().then((module) => ({ default: module.WithdrawSheet })));

/**
 * The owner's tryouts, live: a Firestore listener, so a new or changed tryout
 * appears without a reload. Only tryouts that arrive after the list first
 * loads use item-enter; the first list appears at once.
 */
export function TryoutList({ list, onRetry }: { list: OwnTryouts; onRetry: () => void }) {
  const [withdrawing, setWithdrawing] = useState<string | null>(null);
  const [sheetReady, setSheetReady] = useState(false);

  useEffect(() => {
    const preload = () => void loadSheet().then(() => setSheetReady(true));
    // Older Safari has no requestIdleCallback; a timer still waits until the page has drawn.
    if (typeof requestIdleCallback === "function") {
      const handle = requestIdleCallback(preload);
      return () => cancelIdleCallback(handle);
    }
    const handle = setTimeout(preload, 1);
    return () => clearTimeout(handle);
  }, []);

  if (list.status === "loading") {
    return (
      <div role="status" aria-label="Loading your tryouts" className="flex flex-col gap-4">
        <SlipSkeleton />
        <SlipSkeleton />
      </div>
    );
  }

  if (list.status === "error") {
    return (
      <div className="flex flex-col gap-3">
        <FormError message={`Your tryouts did not load. Check your connection, then tap ${BUTTON_LABELS.tryAgain}.`} />
        <Button variant="secondary" onClick={onRetry}>
          {BUTTON_LABELS.tryAgain}
        </Button>
      </div>
    );
  }

  if (list.tryouts.length === 0) {
    return (
      <div className="flex flex-col gap-2">
        <h3 className="text-base font-bold">No tryouts yet</h3>
        <p className="text-base">Post your first tryout in one sentence. Young people nearby will see it straight away.</p>
      </div>
    );
  }

  return (
    <>
      <ul className="flex flex-col gap-2">
        {orderTryouts(list.tryouts).map((tryout) => {
          const { day, hours } = sastSlot(tryout.startAt, tryout.endAt);
          return (
            <li key={tryout.id} className={list.fresh.has(tryout.id) ? "animate-item-enter" : undefined}>
              {/* A compact row: what and when, the pay, a status chip, and Withdraw while nobody is booked. */}
              <div className="flex flex-col gap-1 border border-line bg-paper p-3">
                <div className="flex items-baseline justify-between gap-3">
                  <Link href={`/business/tryouts/${tryout.id}`} className="inline-flex min-h-11 items-center text-base font-semibold">
                    <span className="link">{tryout.title}</span>
                  </Link>
                  <span className="text-xl font-bold tabular-nums">{formatRand(tryout.payCents)}</span>
                </div>
                <p className="text-sm text-muted">
                  {day}, {hours}, {tryout.area}
                </p>
                <div className="flex min-h-11 flex-wrap items-center justify-between gap-x-4">
                  <span className={`border px-1.5 py-0.5 text-micro font-semibold tabular-nums ${tryout.status === "published" ? "border-ink" : "border-line text-muted"}`}>{statusLine(tryout)}</span>
                  {canWithdraw(tryout.status) ? (
                    <Button variant="quiet" aria-label={`Withdraw ${tryout.title} on ${day}`} onClick={() => setWithdrawing(tryout.id)}>
                      Withdraw
                    </Button>
                  ) : null}
                </div>
              </div>
            </li>
          );
        })}
      </ul>
      {/* Kept mounted once loaded, so closing plays sheet-exit instead of vanishing. */}
      {sheetReady || withdrawing ? (
        <Suspense fallback={null}>
          <WithdrawSheet tryoutId={withdrawing} onClose={() => setWithdrawing(null)} />
        </Suspense>
      ) : null}
    </>
  );
}
