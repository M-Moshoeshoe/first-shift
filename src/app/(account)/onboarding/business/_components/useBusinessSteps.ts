"use client";

import { useState } from "react";
import type { Location } from "@/domain/profile";
import type { ProfileViewResponse } from "@/schemas/profile";

export type BusinessStep = 1 | 2 | 3 | 4 | 5;
export const BUSINESS_STEPS = 5;

/**
 * Where business onboarding stands: which of the five steps are saved, the
 * pin, and the step on screen. Coming back opens the first thing still missing.
 */
export function useBusinessSteps(saved: ProfileViewResponse["business"]) {
  const [done, setDone] = useState({
    details: Boolean(saved?.name && saved.area && saved.openingHours),
    owner: Boolean(saved?.owner.legalName && saved.owner.phone),
    ownerPhoto: saved?.owner.hasPhoto ?? false,
    shopfront: saved?.hasPhoto ?? false,
  });
  const [pin, setPin] = useState<Location | null>(saved?.location ?? null);
  const firstMissing = (state = done, pinned = pin): BusinessStep => (!state.details ? 1 : !state.owner ? 2 : !state.ownerPhoto ? 3 : !pinned ? 4 : 5);
  const [step, setStep] = useState<BusinessStep>(() => firstMissing());
  const [moved, setMoved] = useState(false);
  const [finished, setFinished] = useState(false);

  const go = (next: BusinessStep) => {
    setMoved(true);
    setStep(next);
  };
  /** Marks a step saved and returns the new state, so the caller can go to what's still missing. */
  const mark = (key: keyof typeof done) => {
    const next = { ...done, [key]: true };
    setDone(next);
    return next;
  };
  const doneCount = finished ? BUSINESS_STEPS : [done.details, done.owner, done.ownerPhoto, Boolean(pin), done.shopfront].filter(Boolean).length;
  return { done, pin, setPin, step, go, mark, firstMissing, moved, finished, finish: () => setFinished(true), doneCount };
}
