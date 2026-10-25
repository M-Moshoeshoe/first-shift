import type { PhotoMeta } from "@/domain/profileDecisions";

/** Reads what Storage actually holds at a path, so the server never trusts the browser's word for it. */
export interface PhotoStore {
  /** Null when there is no file at path. */
  metadata(path: string): Promise<PhotoMeta | null>;
  /** The file's bytes and type, for a photo the viewer may see; null when there is no file. */
  download(path: string): Promise<{ bytes: Uint8Array; contentType: string } | null>;
}
