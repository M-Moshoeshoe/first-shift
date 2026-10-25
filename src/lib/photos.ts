import { ref, uploadBytesResumable } from "firebase/storage";
import { PROFILE_MESSAGES } from "@/domain/messages";
import { photoPath, type PhotoKind } from "@/domain/profile";
import { SaveResultSchema, type SaveResult } from "@/schemas/profile";
import { ApiError, apiPost } from "./api";
import { clientStorage } from "./firebaseStorage";
import { prepareImage } from "./imageResize";

/** Longest edge after resizing: plenty for a face or a shopfront, small on data. */
export const PHOTO_MAX_EDGE_PX = 1024;

export const preparePhoto = (file: Blob): Promise<Blob> => prepareImage(file, PHOTO_MAX_EDGE_PX);

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
