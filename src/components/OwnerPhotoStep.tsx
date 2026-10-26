"use client";

import { PhotoStepForm } from "@/components/PhotoStepForm";
import { SavedSummary } from "@/components/SavedSummary";
import { BUTTON_LABELS } from "@/domain/buttonLabels";
import { PROFILE_MESSAGES } from "@/domain/messages";
import { OWNER_FORM_COPY } from "@/domain/profileCopy";
import type { SaveResult } from "@/schemas/profile";
import type { OwnerDraft } from "./OwnerDetailsForm";

/** The owner's face, taken live with the front camera: what a young person sees once booked, so they know who to ask for. */
export function OwnerPhotoStep({ owner, onSaved, onBack }: { owner: OwnerDraft; onSaved: (result: SaveResult) => void; onBack: () => void }) {
  const rows = [
    { term: "Your name", value: owner.legalName },
    { term: "Your cellphone", value: owner.phone },
    ...(owner.cipc ? [{ term: "CIPC number", value: owner.cipc }] : []),
  ];
  return (
    <PhotoStepForm
      kind="profile"
      fieldId="owner-photo"
      heading={OWNER_FORM_COPY.photoTitle}
      focusHeading
      summary={<SavedSummary id="owner-saved" rows={rows} />}
      label={OWNER_FORM_COPY.photoLabel}
      hint={OWNER_FORM_COPY.photoHint}
      saveLabel={BUTTON_LABELS.next}
      neededMessage={PROFILE_MESSAGES.photoNeeded}
      onSaved={onSaved}
      onBack={onBack}
    />
  );
}
