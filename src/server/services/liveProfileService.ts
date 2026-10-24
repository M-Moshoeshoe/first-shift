import "server-only";
import { hashIdNumber } from "../idHash";
import { firebasePhotoStore } from "../repositories/firebasePhotoStore";
import { firestoreProfileRepository } from "../repositories/firestoreProfileRepository";
import { createProfileService, type ProfileService } from "./profileService";

/** The profile service wired to Firestore, Storage and the real ID hash. Routes use this; tests use fakes. */
export function liveProfileService(): ProfileService {
  return createProfileService({ repo: firestoreProfileRepository, photos: firebasePhotoStore, hashId: hashIdNumber, now: () => new Date() });
}
