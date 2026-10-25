import "server-only";
import { adminBucket } from "../firebaseAdmin";
import type { EvidenceStore, PhotoStore } from "./photoStore";

export const firebasePhotoStore: PhotoStore = {
  async metadata(path) {
    const file = adminBucket().file(path);
    const [exists] = await file.exists();
    if (!exists) return null;
    const [meta] = await file.getMetadata();
    return { contentType: String(meta.contentType ?? ""), size: Number(meta.size ?? 0), version: String(meta.generation ?? "") };
  },
  async download(path) {
    const file = adminBucket().file(path);
    const [exists] = await file.exists();
    if (!exists) return null;
    const [[bytes], [meta]] = await Promise.all([file.download(), file.getMetadata()]);
    return { bytes: new Uint8Array(bytes), contentType: String(meta.contentType ?? "image/jpeg") };
  },
};

export const firebaseEvidenceStore: EvidenceStore = {
  async save(path, bytes, contentType) {
    // No download token and no public access: storage.rules denies every client, so only the Admin SDK reads it.
    await adminBucket().file(path).save(Buffer.from(bytes), { contentType, resumable: false, metadata: { cacheControl: "private, no-store" } });
  },
  async remove(path) {
    await adminBucket().file(path).delete({ ignoreNotFound: true });
  },
};
