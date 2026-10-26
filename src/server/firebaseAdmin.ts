import "server-only";
import { cert, getApp, getApps, initializeApp, type App } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
import { getStorage } from "firebase-admin/storage";
import { AppError } from "./errors";
import { serverEnv } from "./env";

const usingEmulator = (): boolean => Boolean(process.env.FIRESTORE_EMULATOR_HOST);

/** The same bucket the browser uploads to. Read by its literal name so Next.js inlines the build-time value. */
export const storageBucketName = (): string | undefined => process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || undefined;

/** Created on first use, so builds and tests never need credentials. */
function adminApp(): App {
  if (getApps().length > 0) return getApp();

  const env = serverEnv();
  const storageBucket = storageBucketName();
  if (usingEmulator()) {
    return initializeApp({ projectId: env.FIREBASE_ADMIN_PROJECT_ID ?? "demo-first-shift", storageBucket });
  }
  if (!env.FIREBASE_ADMIN_PROJECT_ID || !env.FIREBASE_ADMIN_CLIENT_EMAIL || !env.FIREBASE_ADMIN_PRIVATE_KEY) {
    throw new AppError(503, "not_configured", "The server is not set up yet. Add the Firebase Admin settings (see README).");
  }
  return initializeApp({
    credential: cert({
      projectId: env.FIREBASE_ADMIN_PROJECT_ID,
      clientEmail: env.FIREBASE_ADMIN_CLIENT_EMAIL,
      // Netlify stores multi-line values with escaped newlines.
      privateKey: env.FIREBASE_ADMIN_PRIVATE_KEY.replace(/\\n/g, "\n"),
    }),
    storageBucket,
  });
}

export const adminDb = () => getFirestore(adminApp());
export const adminAuth = () => getAuth(adminApp());

/** Fails with a server error, logged, when no bucket is configured: photos can't be checked without it. */
export function adminBucket() {
  if (!storageBucketName()) throw new Error("storage_bucket_not_configured");
  return getStorage(adminApp()).bucket();
}
