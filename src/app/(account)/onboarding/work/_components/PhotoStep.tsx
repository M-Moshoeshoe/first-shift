"use client";

import { PhotoStepForm } from "@/components/PhotoStepForm";
import { BUTTON_LABELS, PROFILE_MESSAGES } from "@/domain/messages";
import type { DetailsDraft } from "./DetailsStep";
import { SavedDetails } from "./SavedDetails";

interface PhotoStepProps {
  details: DetailsDraft;
  idLastFour: string;
  focusHeading: boolean;
  onDone: () => void;
}

/** Step 3: a photo of the young person's face, so the business knows it's them at the door. */
export function PhotoStep({ details, idLastFour, focusHeading, onDone }: PhotoStepProps) {
  return (
    <PhotoStepForm
      kind="profile"
      fieldId="work-photo"
      heading="Your photo"
      focusHeading={focusHeading}
      summary={<SavedDetails details={details} idLastFour={idLastFour} />}
      label="A photo of your face"
      hint="A clear photo, so the business knows it's you at the door."
      saveLabel={BUTTON_LABELS.saveMyProfile}
      neededMessage={PROFILE_MESSAGES.photoNeeded}
      onSaved={onDone}
    />
  );
}
