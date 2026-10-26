"use client";

import Link from "next/link";
import { lazy, Suspense, useEffect, useState } from "react";
import { ShiftSlip } from "@/components/ShiftSlip";
import { SlipSkeleton } from "@/components/SlipSkeleton";
import { Button } from "@/components/ui/Button";
import { FormError } from "@/components/ui/FormError";
import { BUTTON_LABELS } from "@/domain/buttonLabels";
import { sastSlot } from "@/domain/time";
import { useOwnTryouts } from "@/lib/useOwnTryouts";
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
export function TryoutList({ uid }: { uid: string }) {
  const [attempt, setAttempt] = useState(0);
  const [withdrawing, setWithdrawing] = useState<string | null>(null);
  const [sheetReady, setSheetReady] = useState(false);
  const list = useOwnTryouts(uid, attempt);

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
        <Button variant="secondary" onClick={() => setAttempt((count) => count + 1)}>
          {BUTTON_LABELS.tryAgain}
        </Button>
      </div>
    );
  }

  if (list.tryouts.length === 0) {
    return (
      <div className="flex flex-col gap-2">
        <h3 className="text-lg font-bold">No tryouts yet</h3>
        <p className="text-lg">Post your first tryout in one sentence. Young people nearby will see it straight away.</p>
      </div>
    );
  }

  return (
    <>
      <ul className="flex flex-col gap-4">
        {orderTryouts(list.tryouts).map((tryout) => {
          const { day, hours } = sastSlot(tryout.startAt, tryout.endAt);
          return (
            <li key={tryout.id} className={list.fresh.has(tryout.id) ? "animate-item-enter" : undefined}>
              <ShiftSlip
                day={day}
                hours={hours}
                business={tryout.title}
                area={tryout.area}
                payCents={tryout.payCents}
                footer={
                  <div className="flex min-h-11 flex-wrap items-center justify-between gap-x-4">
                    <Link href={`/business/tryouts/${tryout.id}`} aria-label={`${statusLine(tryout)}: open ${tryout.title} on ${day}`} className="inline-flex min-h-11 items-center font-bold underline underline-offset-4 tabular-nums">
                      {statusLine(tryout)}
                    </Link>
                    {canWithdraw(tryout.status) ? (
                      <Button variant="quiet" aria-label={`Withdraw ${tryout.title} on ${day}`} onClick={() => setWithdrawing(tryout.id)}>
                        Withdraw
                      </Button>
                    ) : null}
                  </div>
                }
              />
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
