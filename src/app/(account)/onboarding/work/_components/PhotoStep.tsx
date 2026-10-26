"use client";

import { PhotoStepForm } from "@/components/PhotoStepForm";
import { SavedSummary } from "@/components/SavedSummary";
import { BUTTON_LABELS } from "@/domain/buttonLabels";
import { PROFILE_MESSAGES } from "@/domain/messages";
import { METHOD_LABELS } from "@/domain/paymentMethodCopy";
import { availabilityText } from "./availability";
import type { AboutDraft } from "@/components/AboutFields";
import { LANGUAGE_LABELS, SKILL_LABELS } from "@/domain/profileCopy";
import type { DetailsDraft } from "./DetailsStep";

interface PhotoStepProps {
  details: DetailsDraft;
  about: AboutDraft;
  idLastFour: string;
  focusHeading: boolean;
  onDone: () => void;
  onBack: () => void;
}

/** Step 4: a photo of the young person's face, taken live, so the business knows it's them at the door. */
export function PhotoStep({ details, about, idLastFour, focusHeading, onDone, onBack }: PhotoStepProps) {
  const rows = [
    { term: "First name", value: details.firstName },
    { term: "Area", value: details.area },
    { term: "When you can work", value: availabilityText(details.availability) },
    { term: "Cellphone for payments", value: details.payoutPhone },
    { term: "How you can be paid", value: details.payMethods.map((method) => METHOD_LABELS[method]).join(", ") },
    { term: "What you can do", value: about.skills.map((skill) => SKILL_LABELS[skill]).join(", ") },
    { term: "Languages", value: about.languages.map((language) => LANGUAGE_LABELS[language]).join(", ") },
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
