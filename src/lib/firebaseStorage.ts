import { connectStorageEmulator, getStorage, type FirebaseStorage } from "firebase/storage";
import { EMULATOR_HOST, EMULATOR_PORTS } from "./emulators";
import { clientApp, emulatorsAllowed } from "./firebaseClient";

// Its own module so only the photo screens download Storage.
let storage: FirebaseStorage | undefined;

/** Used only for profile and shopfront photos, the one documented client write (AGENTS.md). */
export function clientStorage(): FirebaseStorage {
  if (!storage) {
    storage = getStorage(clientApp());
    if (emulatorsAllowed()) connectStorageEmulator(storage, EMULATOR_HOST, EMULATOR_PORTS.storage);
  }
  return storage;
}
