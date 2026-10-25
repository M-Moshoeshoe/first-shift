import { RULES } from "@/config/rules";

/*
 * Resizing a picture in the browser before it's sent: photos (photos.ts) and
 * the screenshots added as proof (EvidenceForm). Its own module, with no
 * Firebase code, so a screen that only resizes doesn't download Storage.
 */

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
 * Resizes to at most maxEdge px and re-encodes as JPEG, to save data and stay
 * well under the 2 MB upload limit. Throws PhotoUnreadableError when the
 * browser can't open the file, so the person is told, never left waiting.
 */
export async function prepareImage(file: Blob, maxEdge: number): Promise<Blob> {
  const decoded = await decode(file);
  try {
    if (decoded.width === 0 || decoded.height === 0) throw new PhotoUnreadableError();
    const size = fitWithin(decoded.width, decoded.height, maxEdge);
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

/** A picture as base64, to send in a JSON body (the screenshots added as proof). */
export function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(",")[1] ?? "");
    reader.onerror = () => reject(new PhotoUnreadableError());
    reader.readAsDataURL(blob);
  });
}
