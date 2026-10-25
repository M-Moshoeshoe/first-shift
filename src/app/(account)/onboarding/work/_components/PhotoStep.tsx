"use client";

import { PhotoStepForm } from "@/components/PhotoStepForm";
import { SavedSummary } from "@/components/SavedSummary";
import { BUTTON_LABELS } from "@/domain/buttonLabels";
import { PROFILE_MESSAGES } from "@/domain/messages";
import { availabilityText } from "./availability";
import type { DetailsDraft } from "./DetailsStep";

interface PhotoStepProps {
  details: DetailsDraft;
  idLastFour: string;
  focusHeading: boolean;
  onDone: () => void;
  onBack: () => void;
}

/** Step 3: a photo of the young person's face, so the business knows it's them at the door. */
export function PhotoStep({ details, idLastFour, focusHeading, onDone, onBack }: PhotoStepProps) {
  const rows = [
    { term: "First name", value: details.firstName },
    { term: "Area", value: details.area },
    { term: "When you can work", value: availabilityText(details.availability) },
    { term: "Cellphone for payments", value: details.payoutPhone },
    { term: "ID number", value: `Ending in ${idLastFour}` },
  ];
  return (
    <PhotoStepForm
      kind="profile"
      fieldId="work-photo"
      heading="Your photo"
      focusHeading={focusHeading}
      summary={<SavedSummary id="work-saved" rows={rows} />}
      label="A photo of your face"
      hint="A clear photo, so the business knows it's you at the door."
      saveLabel={BUTTON_LABELS.saveMyProfile}
      neededMessage={PROFILE_MESSAGES.photoNeeded}
      onSaved={onDone}
      onBack={onBack}
    />
  );
}
