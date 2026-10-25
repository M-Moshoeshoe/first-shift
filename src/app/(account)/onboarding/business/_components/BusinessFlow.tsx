"use client";

import { useState } from "react";
import { ProfileDone } from "@/components/ProfileDone";
import { StepProgress } from "@/components/ui/StepProgress";
import { pinPrecisionText } from "@/domain/messages";
import type { Location } from "@/domain/profile";
import type { ProfileViewResponse } from "@/schemas/profile";
import { BusinessDetailsStep, type BusinessDraft } from "./BusinessDetailsStep";
import { PinStep } from "./PinStep";
import { ShopfrontStep } from "./ShopfrontStep";

type Step = 1 | 2 | 3;

/**
 * Three steps: details, premises pin, shopfront photo. Each is saved as soon
 * as it's done, so coming back opens the first thing still missing. The pin
 * can be skipped (location blocked, or not at the business yet), but the
 * profile isn't finished until it's set.
 */
export function BusinessFlow({ view }: { view: ProfileViewResponse }) {
  const saved = view.business;
  const [details, setDetails] = useState<BusinessDraft>({ name: saved?.name ?? "", area: saved?.area ?? "", openingHours: saved?.openingHours ?? "" });
  const [detailsSaved, setDetailsSaved] = useState(Boolean(saved?.name && saved.area && saved.openingHours));
  const [pin, setPin] = useState<Location | null>(saved?.location ?? null);
  const [hasPhoto, setHasPhoto] = useState(saved?.hasPhoto ?? false);
  const [step, setStep] = useState<Step>(() => (!detailsSaved ? 1 : !pin ? 2 : 3));
  const [moved, setMoved] = useState(false);
  const [finished, setFinished] = useState(false);
  const done = finished ? 3 : [detailsSaved, Boolean(pin), hasPhoto].filter(Boolean).length;

  const go = (next: Step) => {
    setMoved(true);
    setStep(next);
  };

  if (finished) {
    // The pin's precision stays on screen with the Stamp, so the owner always sees how precise it was.
    return (
      <div className="flex flex-col gap-6">
        <StepProgress current={3} done={3} total={3} />
        {pin ? <p className="font-bold text-go">{pinPrecisionText(pin.accuracyMetres)}</p> : null}
        <ProfileDone next="/business" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <StepProgress current={step} done={done} total={3} />
      {step === 1 ? (
        <BusinessDetailsStep
          initial={details}
          focusHeading={moved}
          onSaved={(draft) => {
            setDetails(draft);
            setDetailsSaved(true);
            go(pin ? 3 : 2);
          }}
        />
      ) : step === 2 ? (
        <PinStep
          details={details}
          pin={pin}
          hasPhoto={hasPhoto}
          focusHeading={moved}
          onPinned={(next, complete) => {
            setPin(next);
            if (complete) setFinished(true);
          }}
          onNext={() => go(3)}
          onSkip={() => go(3)}
          onBack={() => go(1)}
        />
      ) : (
        <ShopfrontStep
          details={details}
          pin={pin}
          focusHeading={moved}
          onSaved={(complete) => {
            setHasPhoto(true);
            if (complete) setFinished(true);
            else go(2);
          }}
          onBack={() => go(2)}
        />
      )}
    </div>
  );
}
