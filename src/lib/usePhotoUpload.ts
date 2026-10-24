"use client";

import { useEffect, useState } from "react";
import { PROFILE_MESSAGES, UPLOAD_COPY } from "@/domain/messages";
import type { PhotoKind } from "@/domain/profile";
import type { SaveResult } from "@/schemas/profile";
import { ApiError, OFFLINE_MESSAGE } from "./api";

type PhotoTools = typeof import("./photos");

// Storage and the resize code are the heaviest part of onboarding, so they
// download only when a photo step appears, not with the page.
let tools: Promise<PhotoTools> | null = null;
function loadTools(): Promise<PhotoTools> {
  tools ??= import("./photos").catch((error: unknown) => {
    tools = null; // let the next try fetch it again
    throw error;
  });
  return tools;
}

/** After this long, the person is told their connection is slow and to keep the page open. */
const SLOW_AFTER_MS = 10_000;

export type UploadOutcome = { ok: true; result: SaveResult } | { ok: false; message: string };

/**
 * Everything a photo step does: resize and JPEG on choosing, upload with a
 * live percentage, and a "slow connection" line after 10 seconds. Shared by
 * the young person and business forms.
 */
export function usePhotoUpload(kind: PhotoKind) {
  const [photo, setPhoto] = useState<Blob | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [preparing, setPreparing] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [percent, setPercent] = useState<number | null>(null);
  const [slow, setSlow] = useState(false);

  // Start downloading the photo code as soon as the step appears.
  useEffect(() => {
    loadTools().catch(() => undefined);
  }, []);

  // Free the previous preview's memory whenever it's replaced or the step goes away.
  useEffect(() => () => {
    if (preview) URL.revokeObjectURL(preview);
  }, [preview]);

  /** Resizes the chosen file. Returns a message to show, or null when the photo is ready. */
  async function choose(file: File): Promise<string | null> {
    setPreparing(true);
    try {
      const { preparePhoto } = await loadTools().catch(() => {
        throw new ApiError(0, "offline", OFFLINE_MESSAGE);
      });
      const prepared = await preparePhoto(file);
      setPhoto(prepared);
      setPreview(URL.createObjectURL(prepared));
      return null;
    } catch (error) {
      return error instanceof ApiError ? error.message : PROFILE_MESSAGES.photoUnreadable;
    } finally {
      setPreparing(false);
    }
  }

  /** Uploads the prepared photo and has the server record it. */
  async function upload(uid: string, prepared: Blob): Promise<UploadOutcome> {
    setUploading(true);
    setPercent(null);
    setSlow(false);
    const timer = setTimeout(() => setSlow(true), SLOW_AFTER_MS);
    try {
      const { savePhoto } = await loadTools();
      return { ok: true, result: await savePhoto(uid, kind, prepared, setPercent) };
    } catch (error) {
      return { ok: false, message: error instanceof ApiError ? error.message : PROFILE_MESSAGES.photoMissing(kind) };
    } finally {
      clearTimeout(timer);
      setUploading(false);
      setSlow(false);
    }
  }

  const busyLabel = preparing ? UPLOAD_COPY.preparing : UPLOAD_COPY.uploading(percent);
  return { photo, preview, busy: preparing || uploading, busyLabel, slow, choose, upload };
}
