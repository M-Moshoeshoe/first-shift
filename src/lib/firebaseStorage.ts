import { connectStorageEmulator, getStorage, type FirebaseStorage } from "firebase/storage";
import { EMULATOR_HOST, EMULATOR_PORTS } from "./emulators";
import { clientApp, emulatorsAllowed } from "./firebaseClient";

// Its own module so only the photo screens download Storage.
let storage: FirebaseStorage | undefined;

/**
 * The SDK retries a failed upload for 10 minutes by default. 60 seconds gives
 * weak signal a fair chance while the person watches the percentage climb
 * (usePhotoUpload), then they get a clear message instead of waiting on.
 */
const UPLOAD_RETRY_MS = 60_000;

/** Used only for profile and shopfront photos, the one documented client write (AGENTS.md). */
export function clientStorage(): FirebaseStorage {
  if (!storage) {
    storage = getStorage(clientApp());
    storage.maxUploadRetryTime = UPLOAD_RETRY_MS;
    storage.maxOperationRetryTime = UPLOAD_RETRY_MS;
    if (emulatorsAllowed()) connectStorageEmulator(storage, EMULATOR_HOST, EMULATOR_PORTS.storage);
  }
  return storage;
}
