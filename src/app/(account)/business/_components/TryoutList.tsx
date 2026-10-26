"use client";

import { lazy, Suspense, useEffect, useState } from "react";
import { SheetLoading } from "@/components/SheetLoading";
import { SlipSkeleton } from "@/components/SlipSkeleton";
import { Button } from "@/components/ui/Button";
import { Collapsible } from "@/components/ui/Collapsible";
import { FormError } from "@/components/ui/FormError";
import { BUTTON_LABELS } from "@/domain/buttonLabels";
import type { OwnTryouts } from "@/lib/useOwnTryouts";
import { isStillOn, orderTryouts } from "./ownTryouts";
import { TryoutRow } from "./TryoutRow";

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

  const ordered = orderTryouts(list.tryouts);
  return (
    <>
      {[
        { title: "Coming up", group: ordered.filter((tryout) => isStillOn(tryout.status)), open: true },
        { title: "Past", group: ordered.filter((tryout) => !isStillOn(tryout.status)), open: false },
      ].map(({ title, group, open }) =>
        group.length > 0 ? (
          <Collapsible key={title} title={title} count={group.length} open={open}>
            <ul className="flex flex-col gap-2">
              {group.map((tryout) => (
                <li key={tryout.id} className={list.fresh.has(tryout.id) ? "animate-item-enter" : undefined}>
                  <TryoutRow tryout={tryout} onWithdraw={() => setWithdrawing(tryout.id)} />
                </li>
              ))}
            </ul>
          </Collapsible>
        ) : null,
      )}
      {/* Kept mounted once loaded, so closing plays sheet-exit instead of vanishing. */}
      {sheetReady || withdrawing ? (
        <Suspense fallback={withdrawing ? <SheetLoading /> : null}>
          <WithdrawSheet tryoutId={withdrawing} onClose={() => setWithdrawing(null)} />
        </Suspense>
      ) : null}
    </>
  );
}
