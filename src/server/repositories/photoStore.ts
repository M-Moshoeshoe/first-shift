import type { PhotoMeta } from "@/domain/profileDecisions";

/** Reads what Storage actually holds at a path, so the server never trusts the browser's word for it. */
export interface PhotoStore {
  /** Null when there is no file at path. */
  metadata(path: string): Promise<PhotoMeta | null>;
  /** The file's bytes and type, for a photo the viewer may see; null when there is no file. */
  download(path: string): Promise<{ bytes: Uint8Array; contentType: string } | null>;
}

/** Screenshots added after Not received, at private paths only an admin reads (evidence.ts). Written only by the server. */
export interface EvidenceStore {
  save(path: string, bytes: Uint8Array, contentType: string): Promise<void>;
  /** Best effort: a file whose record couldn't be written. */
  remove(path: string): Promise<void>;
}
