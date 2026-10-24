import { getApp, getApps, initializeApp, type FirebaseApp } from "firebase/app";
import { connectAuthEmulator, getAuth, type Auth } from "firebase/auth";
import { EMULATOR_HOST, EMULATOR_PORTS, shouldUseEmulators } from "./emulators";

// NEXT_PUBLIC_ values must be read with literal property names so Next.js can inline them.
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

/** True only for the emulator switch on a local page (see emulators.ts). */
export const emulatorsAllowed = (): boolean => shouldUseEmulators(process.env.NEXT_PUBLIC_USE_EMULATORS, window.location.hostname);

/** Whether this build has the Firebase web settings at all. Safe to call during server rendering. */
export function firebaseConfigured(): boolean {
  return Boolean(firebaseConfig.apiKey && firebaseConfig.projectId);
}

/**
 * Created on first use in the browser, so builds never need the config. Auth
 * lives here; Firestore and Storage have their own modules (firebaseDb.ts,
 * firebaseStorage.ts) so a screen downloads only the services it uses.
 */
export function clientApp(): FirebaseApp {
  if (!firebaseConfigured()) {
    throw new Error("Firebase web settings are missing. Add the NEXT_PUBLIC_FIREBASE_ values (see README).");
  }
  return getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
}

// Created once and, when allowed, pointed at the emulator before first use.
let auth: Auth | undefined;

export function clientAuth(): Auth {
  if (!auth) {
    auth = getAuth(clientApp());
    if (emulatorsAllowed()) connectAuthEmulator(auth, `http://${EMULATOR_HOST}:${EMULATOR_PORTS.auth}`);
  }
  return auth;
}
