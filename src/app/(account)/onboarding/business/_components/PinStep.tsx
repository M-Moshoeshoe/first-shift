"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { FormError } from "@/components/ui/FormError";
import { BUTTON_LABELS } from "@/domain/buttonLabels";
import { LOCATION_COPY, LOCATION_MESSAGES, PROFILE_MESSAGES, pinPrecisionText } from "@/domain/messages";
import type { Location } from "@/domain/profile";
import { ApiError, apiPost } from "@/lib/api";
import { shakeAndFocus } from "@/lib/forms";
import { findPin } from "@/lib/location";
import { useHeadingFocus } from "@/lib/useHeadingFocus";
import { SaveResultSchema } from "@/schemas/profile";
import type { BusinessDraft } from "./BusinessDetailsStep";

const FIELD_ID = "business-pin";
const ERROR_ID = "business-pin-error";

interface PinStepProps {
  details: BusinessDraft;
  pin: Location | null;
  hasPhoto: boolean;
  focusHeading: boolean;
  onPinned: (pin: Location, complete: boolean) => void;
  onNext: () => void;
  onSkip: () => void;
  onBack: () => void;
}

/**
 * Step 4: the premises pin, taken at the business with the phone's location.
 * Shown as words, not a map, to save data. Only a reading of 150 metres or
 * better is accepted; anything else says why and what to do, and the owner
 * can skip for now and come back.
 */
export function PinStep({ details, pin, hasPhoto, focusHeading, onPinned, onNext, onSkip, onBack }: PinStepProps) {
  const [busyLabel, setBusyLabel] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  const heading = useHeadingFocus(focusHeading);

  const refuse = (message: string) => {
    setError(message);
    setFailed(true);
    requestAnimationFrame(() => shakeAndFocus(FIELD_ID));
  };

  const locate = async () => {
    if (busyLabel) return;
    setError(null);
    setBusyLabel(LOCATION_COPY.finding);
    const found = await findPin();
    if (!found.ok) {
      setBusyLabel(null);
      return refuse(LOCATION_MESSAGES[found.error]);
    }
    setBusyLabel(LOCATION_COPY.saving);
    try {
      const result = await apiPost("/api/profile/business", { ...details, location: found.value }, SaveResultSchema);
      setBusyLabel(null);
      onPinned(found.value, result.complete);
    } catch (caught) {
      setBusyLabel(null);
      refuse(caught instanceof ApiError ? caught.message : PROFILE_MESSAGES.fallback);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <h2 ref={heading} tabIndex={-1} className="text-xl font-bold">
        Your premises pin
      </h2>
      {hasPhoto && !pin ? (
        <p role="status" className="text-lg font-bold">
          {PROFILE_MESSAGES.pinMissing}
        </p>
      ) : null}
      <p>Tap {BUTTON_LABELS.useMyLocation} while you&apos;re at your business, so young people come to the right place.</p>
      <div data-field={FIELD_ID} className="flex flex-col gap-2">
        {pin ? (
          <p role="status" className="font-bold text-go">
            {pinPrecisionText(pin.accuracyMetres)}
          </p>
        ) : null}
        <Button variant={pin ? "secondary" : "primary"} busy={busyLabel !== null} busyLabel={busyLabel ?? undefined} aria-describedby={ERROR_ID} onClick={() => void locate()}>
          {BUTTON_LABELS.useMyLocation}
        </Button>
        <FormError id={ERROR_ID} message={error} />
      </div>
      <div className="flex flex-col gap-3">
        {pin && !hasPhoto ? <Button onClick={onNext}>{BUTTON_LABELS.next}</Button> : null}
        {!pin && failed && !hasPhoto ? (
          <Button variant="secondary" onClick={onSkip}>
            {BUTTON_LABELS.skipForNow}
          </Button>
        ) : null}
        <Button variant="secondary" disabled={busyLabel !== null} onClick={onBack}>
          {BUTTON_LABELS.back}
        </Button>
      </div>
    </div>
  );
}
