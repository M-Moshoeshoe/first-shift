"use client";

import type { AnimationEvent } from "react";

/** The only words a Stamp can say (docs/DESIGN.md, Motion). */
export type StampLabel = "Paid" | "Received" | "Booked" | "Profile done" | "Posted";

function shouldVibrate(): boolean {
  if (!("vibrate" in navigator)) return false;
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return false;
  // Browsers block vibration before the person has tapped the page; skip it rather than trigger a console warning.
  return navigator.userActivation?.hasBeenActive ?? true;
}

/**
 * The signature moment: a gold stamp that lands on something won. With the
 * slip stub, the only place gold is applied. Reduced motion makes it appear
 * in place, through the one rule in globals.css.
 */
export function Stamp({ label }: { label: StampLabel }) {
  const handleLanded = (event: AnimationEvent<HTMLSpanElement>) => {
    if (event.target === event.currentTarget && shouldVibrate()) navigator.vibrate(15);
  };

  return (
    <span onAnimationEnd={handleLanded} className="inline-block -rotate-8 animate-stamp border-2 border-ink bg-gold px-3 py-1 text-base font-bold text-ink">
      {label}
    </span>
  );
}
