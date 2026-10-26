"use client";

import { useState, type FormEvent, type ReactNode } from "react";
import { Button } from "@/components/ui/Button";
import { PhotoField } from "@/components/ui/PhotoField";
import { BUTTON_LABELS } from "@/domain/buttonLabels";
import { UPLOAD_COPY } from "@/domain/messages";
import type { PhotoKind } from "@/domain/profile";
import { useAuth } from "@/lib/auth/useAuth";
import { shakeAndFocus } from "@/lib/forms";
import { usePhotoUpload } from "@/lib/usePhotoUpload";
import { useHeadingFocus } from "@/lib/useHeadingFocus";
import type { SaveResult } from "@/schemas/profile";

interface PhotoStepFormProps {
  kind: PhotoKind;
  fieldId: string;
  heading: string;
  focusHeading: boolean;
  /** What's already saved, shown above the photo. */
  summary: ReactNode;
  label: string;
  hint: string;
  saveLabel: string;
  /** Shown when Save is tapped with no photo chosen. */
  neededMessage: string;
  onSaved: (result: SaveResult) => void;
  /** Back to the previous step; what's saved stays saved. */
  onBack?: () => void;
}

/**
 * The last step of both onboarding forms. The photo is resized and turned
 * into a JPEG the moment it's chosen, so a photo the phone can't open is
 * caught straight away; saving uploads it with a live percentage. The camera
 * opens in the page: the front one for a face, the back one for a shopfront.
 */
export function PhotoStepForm({ kind, fieldId, heading, focusHeading, summary, label, hint, saveLabel, neededMessage, onSaved, onBack }: PhotoStepFormProps) {
  const { user } = useAuth();
  const photos = usePhotoUpload(kind);
  const [error, setError] = useState<string | null>(null);
  const headingRef = useHeadingFocus(focusHeading);

  const refuse = (message: string) => {
    setError(message);
    requestAnimationFrame(() => shakeAndFocus(fieldId));
  };

  const handleSelect = async (file: File) => {
    setError(null);
    const problem = await photos.choose(file);
    if (problem) refuse(problem);
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (photos.busy) return;
    if (!photos.photo || !user) return refuse(neededMessage);
    const outcome = await photos.upload(user.uid, photos.photo);
    if (outcome.ok) onSaved(outcome.result);
    else refuse(outcome.message);
  };

  return (
    <form noValidate onSubmit={(event) => void handleSubmit(event)} className="flex flex-col gap-4">
      <h2 ref={headingRef} tabIndex={-1} className="text-xl font-bold">
        {heading}
      </h2>
      {summary}
      <PhotoField
        id={fieldId}
        label={label}
        hint={hint}
        camera={kind === "profile" ? "user" : "environment"}
        allowGallery={kind === "shopfront"}
        preview={photos.preview}
        error={error}
        onSelect={(file) => void handleSelect(file)}
      />
      <div className="flex flex-col gap-3">
        <Button type="submit" busy={photos.busy} busyLabel={photos.busyLabel}>
          {saveLabel}
        </Button>
        {onBack ? (
          <Button variant="secondary" disabled={photos.busy} onClick={onBack}>
            {BUTTON_LABELS.back}
          </Button>
        ) : null}
        <p role="status" className="text-sm text-muted">
          {photos.slow ? UPLOAD_COPY.slow : ""}
        </p>
      </div>
    </form>
  );
}
