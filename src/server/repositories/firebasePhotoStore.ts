import "server-only";
import { adminBucket } from "../firebaseAdmin";
import type { PhotoStore } from "./photoStore";

export const firebasePhotoStore: PhotoStore = {
  async metadata(path) {
    const file = adminBucket().file(path);
    const [exists] = await file.exists();
    if (!exists) return null;
    const [meta] = await file.getMetadata();
    return { contentType: String(meta.contentType ?? ""), size: Number(meta.size ?? 0), version: String(meta.generation ?? "") };
  },
};
