"use client";

import Image from "next/image";
import { useEffect, useState, type ChangeEvent } from "react";
import { buttonClass } from "./Button";
import { FormError } from "./FormError";

interface PhotoFieldProps {
  id: string;
  label: string;
  hint?: string;
  error?: string | null;
  onSelect: (file: File) => void;
}

/**
 * A labelled photo picker. The real file input stays in the DOM, visually
 * hidden inside a label styled as a secondary button, and focus shows on that
 * label. The preview is square, like every photo.
 */
export function PhotoField({ id, label, hint, error, onSelect }: PhotoFieldProps) {
  const [preview, setPreview] = useState<string | null>(null);
  const labelId = `${id}-label`;
  const actionId = `${id}-action`;
  const hintId = `${id}-hint`;
  const errorId = `${id}-error`;

  // Free the previous preview's memory whenever it's replaced or the field goes away.
  useEffect(() => () => {
    if (preview) URL.revokeObjectURL(preview);
  }, [preview]);

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    // Closing the picker without choosing keeps the photo already chosen.
    if (!file) return;
    setPreview(URL.createObjectURL(file));
    onSelect(file);
  };

  return (
    <div className="flex flex-col gap-1">
      <p id={labelId} className="font-bold">
        {label}
      </p>
      {hint ? (
        <p id={hintId} className="text-sm text-muted">
          {hint}
        </p>
      ) : null}
      {preview ? (
        <Image src={preview} alt="The photo you chose" width={128} height={128} unoptimized className="my-2 size-32 border-2 border-ink object-cover" />
      ) : null}
      <label
        htmlFor={id}
        className={`${buttonClass("secondary")} relative cursor-pointer focus-within:outline-3 focus-within:outline-offset-2 focus-within:outline-ink`}
      >
        <input
          id={id}
          type="file"
          accept="image/*"
          aria-labelledby={`${labelId} ${actionId}`}
          aria-describedby={hint ? `${hintId} ${errorId}` : errorId}
          aria-invalid={error ? true : undefined}
          onChange={handleChange}
          className="sr-only"
        />
        <span id={actionId}>{preview ? "Change photo" : "Take or choose a photo"}</span>
      </label>
      <FormError id={errorId} message={error} />
    </div>
  );
}
