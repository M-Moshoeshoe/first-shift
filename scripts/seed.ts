import { initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { DEMO_BUSINESS, DEMO_TRYOUT_STAGES, DEMO_WORKERS } from "../src/data/demo";

/**
 * Writes demo data. Refuses to run against a live project unless you say so
 * explicitly, so test data can never leak into real users' feeds by accident.
 */
const usingEmulator = Boolean(process.env.FIRESTORE_EMULATOR_HOST);
const allowLive = process.env.SEED_DEMO_PROJECT === "yes";

if (!usingEmulator && !allowLive) {
  console.error("Refusing to seed: start the emulators first, or set SEED_DEMO_PROJECT=yes for a dedicated demo project.");
  process.exit(1);
}

initializeApp({ projectId: process.env.FIREBASE_ADMIN_PROJECT_ID ?? "demo-first-shift" });
const db = getFirestore();

async function seed(): Promise<void> {
  const batch = db.batch();
  batch.set(db.doc(`businesses/${DEMO_BUSINESS.id}`), DEMO_BUSINESS);
  for (const worker of DEMO_WORKERS) batch.set(db.doc(`users/${worker.id}`), worker);
  for (const stage of DEMO_TRYOUT_STAGES) {
    batch.set(db.doc(`tryouts/demo-${stage}`), { stage, ownerId: DEMO_BUSINESS.ownerId, status: "published", demo: true });
  }
  await batch.commit();
  console.log(`Seeded ${DEMO_WORKERS.length} workers, 1 business and ${DEMO_TRYOUT_STAGES.length} tryout stages.`);
}

seed().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
