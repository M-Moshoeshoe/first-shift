"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { FEED_COPY } from "@/domain/findingMessages";

const DISMISSED_KEY = "first-shift:tryout-explainer-dismissed";

// Browser storage may be blocked or empty (private windows, cleared data): the card then simply shows again.
const readDismissed = (): boolean => {
  try {
    return window.localStorage.getItem(DISMISSED_KEY) === "yes";
  } catch {
    return false;
  }
};

/** On a first visit: what a tryout is, in two sentences, until the person taps Got it. */
export function TryoutExplainer() {
  const [dismissed, setDismissed] = useState(readDismissed);
  if (dismissed) return null;

  const dismiss = () => {
    setDismissed(true);
    try {
      window.localStorage.setItem(DISMISSED_KEY, "yes");
    } catch {
      // Not remembered on this phone; it shows again next time, which is harmless.
    }
  };

  return (
    <section aria-labelledby="tryout-explainer" className="flex flex-col gap-3 border border-line p-4">
      <div className="flex flex-col gap-2">
        <h2 id="tryout-explainer" className="text-xl font-bold">
          {FEED_COPY.explainerTitle}
        </h2>
        <p className="text-base">{FEED_COPY.explainer}</p>
      </div>
      <div>
        <Button variant="quiet" onClick={dismiss}>
          {FEED_COPY.explainerDismiss}
        </Button>
      </div>
    </section>
  );
}
