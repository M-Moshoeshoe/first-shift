import { connectFirestoreEmulator, getFirestore, type Firestore } from "firebase/firestore";
import { EMULATOR_HOST, EMULATOR_PORTS } from "./emulators";
import { clientApp, emulatorsAllowed } from "./firebaseClient";

// Its own module so screens that don't read Firestore never download it.
let db: Firestore | undefined;

/** Read-only in practice: Firestore rules deny every client write (AGENTS.md). */
export function clientDb(): Firestore {
  if (!db) {
    db = getFirestore(clientApp());
    if (emulatorsAllowed()) connectFirestoreEmulator(db, EMULATOR_HOST, EMULATOR_PORTS.firestore);
  }
  return db;
}
