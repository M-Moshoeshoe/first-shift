"use client";

import { PhotoStepForm } from "@/components/PhotoStepForm";
import { SavedSummary } from "@/components/SavedSummary";
import { BUTTON_LABELS } from "@/domain/buttonLabels";
import { LOCATION_COPY, PROFILE_MESSAGES, pinPrecisionText } from "@/domain/messages";
import type { Location } from "@/domain/profile";
import type { BusinessDraft } from "./BusinessDetailsStep";
import { COIDA_OPTION_LABELS } from "@/domain/injuryCover";

interface ShopfrontStepProps {
  details: BusinessDraft;
  pin: Location | null;
  focusHeading: boolean;
  onSaved: (complete: boolean) => void;
  onBack: () => void;
}

/** Step 3: a photo of the shopfront from the street, taken with the back camera. */
export function ShopfrontStep({ details, pin, focusHeading, onSaved, onBack }: ShopfrontStepProps) {
  const rows = [
    { term: "Business name", value: details.name },
    { term: "Area", value: details.area },
    { term: "Opening hours", value: details.openingHours },
    { term: "Injury cover", value: details.coida ? COIDA_OPTION_LABELS[details.coida] : "Not answered" },
    { term: "Premises pin", value: pin ? pinPrecisionText(pin.accuracyMetres) : LOCATION_COPY.notPinned },
  ];
  return (
    <PhotoStepForm
      kind="shopfront"
      fieldId="business-photo"
      heading="Your shopfront"
      focusHeading={focusHeading}
      summary={<SavedSummary id="business-saved" rows={rows} />}
      label="A photo of your shopfront"
      hint="Take it from the street, so young people can find you."
      saveLabel={BUTTON_LABELS.saveMyBusiness}
      neededMessage={PROFILE_MESSAGES.shopfrontNeeded}
      onSaved={(result) => onSaved(result.complete)}
      onBack={onBack}
    />
  );
}
