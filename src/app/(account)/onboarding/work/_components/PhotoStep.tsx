"use client";

import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/Button";
import { PhotoField } from "@/components/ui/PhotoField";
import { BUTTON_LABELS, PROFILE_MESSAGES, UPLOAD_COPY } from "@/domain/messages";
import { useAuth } from "@/lib/auth/useAuth";
import { shakeAndFocus } from "@/lib/forms";
import { usePhotoUpload } from "@/lib/usePhotoUpload";
import type { DetailsDraft } from "./DetailsStep";
import { SavedDetails } from "./SavedDetails";
import { useHeadingFocus } from "./useHeadingFocus";

const FIELD_ID = "work-photo";

interface PhotoStepProps {
  details: DetailsDraft;
  idLastFour: string;
  focusHeading: boolean;
  onDone: () => void;
}

/**
 * Step 3: the photo is resized and turned into a JPEG the moment it's chosen,
 * so a photo the phone can't open is caught straight away. Saving uploads it
 * with a live percentage and asks the server to check and record it.
 */
export function PhotoStep({ details, idLastFour, focusHeading, onDone }: PhotoStepProps) {
  const { user } = useAuth();
  const photos = usePhotoUpload("profile");
  const [error, setError] = useState<string | null>(null);
  const heading = useHeadingFocus(focusHeading);

  const refuse = (message: string) => {
    setError(message);
    requestAnimationFrame(() => shakeAndFocus(FIELD_ID));
  };

  const handleSelect = async (file: File) => {
    setError(null);
    const problem = await photos.choose(file);
    if (problem) refuse(problem);
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (photos.busy) return;
    if (!photos.photo || !user) return refuse(PROFILE_MESSAGES.photoNeeded);
    const outcome = await photos.upload(user.uid, photos.photo);
    if (outcome.ok) onDone();
    else refuse(outcome.message);
  };

  return (
    <form noValidate onSubmit={(event) => void handleSubmit(event)} className="flex flex-col gap-5">
      <h2 ref={heading} tabIndex={-1} className="text-xl font-bold">
        Your photo
      </h2>
      <SavedDetails details={details} idLastFour={idLastFour} />
      <PhotoField
        id={FIELD_ID}
        label="A photo of your face"
        hint="A clear photo, so the business knows it's you at the door."
        camera="user"
        preview={photos.preview}
        error={error}
        onSelect={(file) => void handleSelect(file)}
      />
      <div className="flex flex-col gap-2">
        <Button type="submit" busy={photos.busy} busyLabel={photos.busyLabel}>
          {BUTTON_LABELS.saveMyProfile}
        </Button>
        <p role="status" className="text-sm text-muted">
          {photos.slow ? UPLOAD_COPY.slow : ""}
        </p>
      </div>
    </form>
  );
}
