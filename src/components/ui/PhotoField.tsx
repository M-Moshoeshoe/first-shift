import Image from "next/image";
import type { ChangeEvent } from "react";
import { BUTTON_LABELS } from "@/domain/buttonLabels";
import { buttonClass } from "./Button";
import { FormError } from "./FormError";

interface PhotoFieldProps {
  id: string;
  label: string;
  hint?: string;
  error?: string | null;
  /** The photo as it will be uploaded, already resized; the parent owns the object URL. */
  preview?: string | null;
  /** Which camera "Take a photo" opens: the front one for a face, the back one for a shopfront. */
  camera: "user" | "environment";
  onSelect: (file: File) => void;
}

/**
 * A labelled photo picker with two ways in: take a photo with the camera, or
 * choose one already on the phone. Each real file input stays in the DOM,
 * visually hidden inside a label styled as a secondary button; focus shows on
 * that label. The preview is square, like every photo.
 */
export function PhotoField({ id, label, hint, error, preview, camera, onSelect }: PhotoFieldProps) {
  const labelId = `${id}-label`;
  const hintId = `${id}-hint`;
  const errorId = `${id}-error`;
  const options = [
    { inputId: `${id}-camera`, text: BUTTON_LABELS.takeAPhoto, capture: camera },
    { inputId: `${id}-library`, text: BUTTON_LABELS.chooseAPhoto, capture: undefined },
  ];

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    // Cleared so picking the same file again still counts as a choice.
    event.target.value = "";
    // Closing the picker without choosing keeps the photo already chosen.
    if (file) onSelect(file);
  };

  return (
    <div data-field={id} className="flex flex-col gap-2">
      <p id={labelId} className="font-bold">
        {label}
      </p>
      {hint ? (
        <p id={hintId} className="text-sm text-muted">
          {hint}
        </p>
      ) : null}
      {preview ? (
        <Image src={preview} alt="The photo you chose" width={128} height={128} unoptimized className="size-32 border-2 border-ink object-cover" />
      ) : null}
      <div className="flex flex-col gap-3">
        {options.map((option) => (
          <label
            key={option.inputId}
            htmlFor={option.inputId}
            className={`${buttonClass("secondary")} relative cursor-pointer focus-within:outline-3 focus-within:outline-offset-2 focus-within:outline-ink`}
          >
            <input
              id={option.inputId}
              type="file"
              accept="image/*"
              capture={option.capture}
              aria-labelledby={`${labelId} ${option.inputId}-text`}
              aria-describedby={hint ? `${hintId} ${errorId}` : errorId}
              aria-invalid={error ? true : undefined}
              onChange={handleChange}
              className="sr-only"
            />
            <span id={`${option.inputId}-text`}>{option.text}</span>
          </label>
        ))}
      </div>
      <FormError id={errorId} message={error} />
    </div>
  );
}
