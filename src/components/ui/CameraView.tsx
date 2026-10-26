"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "./Button";
import { CAMERA_COPY } from "@/domain/profileCopy";

interface CameraViewProps {
  /** The front camera for a face, the back one for a shopfront. */
  facing: "user" | "environment";
  onCapture: (photo: File) => void;
  /** No camera, or it was refused: the caller falls back to the phone's own camera. */
  onUnavailable: () => void;
  onClose: () => void;
}

const JPEG_QUALITY = 0.9;
const TAKE_ID = "camera-take";

/**
 * The live camera, in the page (getUserMedia), with a framing guide drawn
 * over the picture. Taking the photo copies one frame to a canvas as a JPEG
 * and turns the camera off. A face is shown mirrored, as in a mirror, but
 * saved the right way round. Loaded only when a photo step opens it.
 */
export function CameraView({ facing, onCapture, onUnavailable, onClose }: CameraViewProps) {
  const video = useRef<HTMLVideoElement>(null);
  const stream = useRef<MediaStream | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    if (!navigator.mediaDevices?.getUserMedia) {
      onUnavailable();
      return undefined;
    }
    navigator.mediaDevices
      .getUserMedia({ video: { facingMode: facing, width: { ideal: 1280 } }, audio: false })
      .then((media) => {
        if (cancelled) return media.getTracks().forEach((track) => track.stop());
        stream.current = media;
        if (video.current) video.current.srcObject = media;
      })
      .catch((error: unknown) => {
        console.warn("camera_unavailable", error instanceof Error ? error.name : "unknown");
        if (!cancelled) onUnavailable();
      });
    return () => {
      cancelled = true;
      stream.current?.getTracks().forEach((track) => track.stop());
      stream.current = null;
    };
  }, [facing, onUnavailable]);

  const take = () => {
    const source = video.current;
    if (!source || source.videoWidth === 0) return;
    const canvas = document.createElement("canvas");
    canvas.width = source.videoWidth;
    canvas.height = source.videoHeight;
    canvas.getContext("2d")?.drawImage(source, 0, 0);
    canvas.toBlob(
      (blob) => {
        if (!blob) return onUnavailable();
        stream.current?.getTracks().forEach((track) => track.stop());
        onCapture(new File([blob], "camera.jpg", { type: "image/jpeg" }));
      },
      "image/jpeg",
      JPEG_QUALITY,
    );
  };

  const face = facing === "user";
  return (
    <div className="flex flex-col gap-3">
      <div className="relative aspect-square w-full overflow-hidden border-2 border-ink bg-ink">
        <video
          ref={video}
          autoPlay
          playsInline
          muted
          aria-label={face ? CAMERA_COPY.faceView : CAMERA_COPY.shopView}
          onLoadedData={() => {
            setReady(true);
            document.getElementById(TAKE_ID)?.focus();
          }}
          className={`size-full object-cover ${face ? "-scale-x-100" : ""}`}
        />
        {/* The framing guide: where the face or the shopfront should sit. Square edges, never an oval. */}
        <div aria-hidden="true" className={`pointer-events-none absolute border-2 border-dashed border-paper ${face ? "inset-x-[20%] inset-y-[12%]" : "inset-x-[6%] inset-y-[14%]"}`} />
      </div>
      <Button id={TAKE_ID} variant="secondary" disabled={!ready} busy={!ready} busyLabel={CAMERA_COPY.opening} onClick={take}>
        {CAMERA_COPY.take}
      </Button>
      <Button variant="quiet" onClick={onClose}>
        {CAMERA_COPY.close}
      </Button>
    </div>
  );
}
