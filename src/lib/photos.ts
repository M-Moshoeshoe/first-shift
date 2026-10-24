import { ref, uploadBytesResumable } from "firebase/storage";
import { RULES } from "@/config/rules";
import { PROFILE_MESSAGES } from "@/domain/messages";
import { photoPath, type PhotoKind } from "@/domain/profile";
import { SaveResultSchema, type SaveResult } from "@/schemas/profile";
import { ApiError, apiPost } from "./api";
import { clientStorage } from "./firebaseStorage";

/** Longest edge after resizing: plenty for a face or a shopfront, small on data. */
export const PHOTO_MAX_EDGE_PX = 1024;
const JPEG_QUALITIES = [0.82, 0.7, 0.55];

/** The browser couldn't open the image (for example HEIC on some Android browsers). */
export class PhotoUnreadableError extends Error {}

/** Scales a size down to fit inside max on its longest edge. Never scales up. */
export function fitWithin(width: number, height: number, max: number): { width: number; height: number } {
  const scale = Math.min(1, max / Math.max(width, height));
  return { width: Math.max(1, Math.round(width * scale)), height: Math.max(1, Math.round(height * scale)) };
}

interface Decoded {
  source: CanvasImageSource;
  width: number;
  height: number;
  release: () => void;
}

/** createImageBitmap first (honours the phone's rotation), then an <img> for older browsers. */
async function decode(file: Blob): Promise<Decoded> {
  try {
    const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
    return { source: bitmap, width: bitmap.width, height: bitmap.height, release: () => bitmap.close() };
  } catch {
    // Fall through to the <img> route.
  }
  const url = URL.createObjectURL(file);
  const image = new Image();
  image.src = url;
  try {
    await image.decode();
  } catch {
    URL.revokeObjectURL(url);
    throw new PhotoUnreadableError();
  }
  return { source: image, width: image.naturalWidth, height: image.naturalHeight, release: () => URL.revokeObjectURL(url) };
}

const toJpeg = (canvas: HTMLCanvasElement, quality: number) =>
  new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", quality));

/**
 * Resizes to at most 1024 px and re-encodes as JPEG, to save data and stay
 * well under the 2 MB upload limit. Throws PhotoUnreadableError when the
 * browser can't open the file, so the person is told, never left waiting.
 */
export async function preparePhoto(file: Blob): Promise<Blob> {
  const decoded = await decode(file);
  try {
    if (decoded.width === 0 || decoded.height === 0) throw new PhotoUnreadableError();
    const size = fitWithin(decoded.width, decoded.height, PHOTO_MAX_EDGE_PX);
    const canvas = document.createElement("canvas");
    canvas.width = size.width;
    canvas.height = size.height;
    const context = canvas.getContext("2d");
    if (!context) throw new PhotoUnreadableError();
    context.drawImage(decoded.source, 0, 0, size.width, size.height);
    for (const quality of JPEG_QUALITIES) {
      const blob = await toJpeg(canvas, quality);
      if (blob && blob.size < RULES.photoMaxBytes) return blob;
    }
    throw new PhotoUnreadableError();
  } finally {
    decoded.release();
  }
}

/**
 * Uploads to the person's own folder, reporting whole percentages as it goes,
 * then asks the server to check and record it.
 */
export async function savePhoto(uid: string, kind: PhotoKind, photo: Blob, onProgress?: (percent: number) => void): Promise<SaveResult> {
  try {
    await new Promise<void>((resolve, reject) => {
      const task = uploadBytesResumable(ref(clientStorage(), photoPath(uid, kind)), photo, { contentType: "image/jpeg" });
      task.on("state_changed", (snapshot) => onProgress?.(Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100)), reject, resolve);
    });
  } catch (error) {
    console.warn("photo_upload_failed", error instanceof Error ? error.name : "unknown");
    throw new ApiError(0, "upload_failed", PROFILE_MESSAGES.photoMissing(kind));
  }
  return apiPost("/api/profile/photo", { kind }, SaveResultSchema);
}
