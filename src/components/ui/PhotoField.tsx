"use client";

import Image from "next/image";
import { lazy, Suspense, useCallback, useState, type ChangeEvent } from "react";
import { BUTTON_LABELS } from "@/domain/buttonLabels";
import { CAMERA_COPY } from "@/domain/profileCopy";
import { Button, buttonClass } from "./Button";
import { FormError } from "./FormError";

// The camera code loads only when someone opens it.
const CameraView = lazy(() => import("./CameraView").then((module) => ({ default: module.CameraView })));

interface PhotoFieldProps {
  id: string;
  label: string;
  hint?: string;
  error?: string | null;
  /** The photo as it will be uploaded, already resized; the parent owns the object URL. */
  preview?: string | null;
  /** Which camera opens: the front one for a face, the back one for a shopfront. */
  camera: "user" | "environment";
  /** A face is always taken live; only a shopfront may come from the phone's gallery. */
  allowGallery: boolean;
  onSelect: (file: File) => void;
}

/** A visually hidden file input inside a label styled as a secondary button; focus shows on the label. */
function FileButton({ inputId, text, capture, describedBy, invalid, onChange }: { inputId: string; text: string; capture?: "user" | "environment"; describedBy: string; invalid: boolean; onChange: (event: ChangeEvent<HTMLInputElement>) => void }) {
  return (
    <label htmlFor={inputId} className={`${buttonClass("secondary")} relative cursor-pointer focus-within:outline-3 focus-within:outline-offset-2 focus-within:outline-ink`}>
      <input id={inputId} type="file" accept="image/*" capture={capture} aria-describedby={describedBy} aria-invalid={invalid || undefined} onChange={onChange} className="sr-only" />
      <span>{text}</span>
    </label>
  );
}

/**
 * A labelled photo taker. The camera opens in the page, with a framing guide
 * and, for a face, three tips. Where the browser can't open it (or it's
 * refused), the phone's own camera opens through a file input with capture
 * set, and one line says so. A face is never taken from the gallery; a
 * shopfront may be. The preview is square, like every photo.
 */
export function PhotoField({ id, label, hint, error, preview, camera, allowGallery, onSelect }: PhotoFieldProps) {
  const [mode, setMode] = useState<"closed" | "open" | "fallback">("closed");
  const hintId = `${id}-hint`;
  const errorId = `${id}-error`;
  const describedBy = hint ? `${hintId} ${errorId}` : errorId;
  const face = camera === "user";
  const unavailable = useCallback(() => setMode("fallback"), []);

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    // Cleared so picking the same file again still counts as a choice.
    event.target.value = "";
    // Closing the picker without choosing keeps the photo already chosen.
    if (file) onSelect(file);
  };

  return (
    <div data-field={id} className="flex flex-col gap-2">
      <p className="font-semibold">{label}</p>
      {hint ? (
        <p id={hintId} className="text-sm text-muted">
          {hint}
        </p>
      ) : null}
      {face ? (
        <ul className="flex list-disc flex-col gap-1 pl-5 text-sm">
          {CAMERA_COPY.tips.map((tip) => (
            <li key={tip}>{tip}</li>
          ))}
        </ul>
      ) : null}
      {preview && mode !== "open" ? <Image src={preview} alt="The photo you took" width={128} height={128} unoptimized className="size-32 border border-line object-cover" /> : null}
      <div className="flex flex-col gap-3">
        {mode === "closed" ? (
          <Button variant="secondary" aria-describedby={describedBy} onClick={() => setMode("open")}>
            {CAMERA_COPY.open}
          </Button>
        ) : null}
        {mode === "open" ? (
          <Suspense fallback={<div role="status" aria-label={CAMERA_COPY.opening} className="aspect-square w-full skeleton" />}>
            <CameraView
              facing={camera}
              onUnavailable={unavailable}
              onClose={() => setMode("closed")}
              onCapture={(file) => {
                setMode("closed");
                onSelect(file);
              }}
            />
          </Suspense>
        ) : null}
        {mode === "fallback" ? (
          <>
            <p className="text-sm">{CAMERA_COPY.unavailable}</p>
            <FileButton inputId={`${id}-camera`} text={CAMERA_COPY.fallback} capture={camera} describedBy={describedBy} invalid={Boolean(error)} onChange={handleChange} />
          </>
        ) : null}
        {allowGallery ? <FileButton inputId={`${id}-library`} text={BUTTON_LABELS.chooseAPhoto} describedBy={describedBy} invalid={Boolean(error)} onChange={handleChange} /> : null}
      </div>
      <FormError id={errorId} message={error} />
    </div>
  );
}
