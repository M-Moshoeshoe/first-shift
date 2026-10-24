"use client";

import { PhotoStepForm } from "@/components/PhotoStepForm";
import { BUTTON_LABELS, PROFILE_MESSAGES } from "@/domain/messages";
import type { Location } from "@/domain/profile";
import type { BusinessDraft } from "./BusinessDetailsStep";
import { BusinessSaved } from "./BusinessSaved";

interface ShopfrontStepProps {
  details: BusinessDraft;
  pin: Location | null;
  focusHeading: boolean;
  onSaved: (complete: boolean) => void;
}

/** Step 3: a photo of the shopfront from the street, taken with the back camera. */
export function ShopfrontStep({ details, pin, focusHeading, onSaved }: ShopfrontStepProps) {
  return (
    <PhotoStepForm
      kind="shopfront"
      fieldId="business-photo"
      heading="Your shopfront"
      focusHeading={focusHeading}
      summary={<BusinessSaved details={details} pin={pin} />}
      label="A photo of your shopfront"
      hint="Take it from the street, so young people can find you."
      saveLabel={BUTTON_LABELS.saveMyBusiness}
      neededMessage={PROFILE_MESSAGES.shopfrontNeeded}
      onSaved={(result) => onSaved(result.complete)}
    />
  );
}
