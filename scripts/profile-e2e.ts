import { initializeApp as initializeAdmin } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { GoogleAuthProvider, signInWithCredential, signOut } from "firebase/auth";
import { ApiError, apiPost } from "../src/lib/api";
import { clientAuth } from "../src/lib/firebaseClient";
import { SaveResultSchema } from "../src/schemas/profile";

/**
 * End-to-end check of the profile routes, as the browser calls them: the real
 * src/lib/api.ts, the real routes on a running dev server, the Firestore and
 * Auth emulators underneath. Never run against a live project, and never
 * imported by app code.
 *
 *   npm run emulators            (one terminal)
 *   npm run dev                  (another, with the emulator settings from README)
 *   npm run e2e:profile          (a third, with the same settings)
 */
const PROJECT = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ?? "demo-first-shift";
const firestoreHost = process.env.FIRESTORE_EMULATOR_HOST;
const authHost = process.env.FIREBASE_AUTH_EMULATOR_HOST;
const BASE = process.env.E2E_BASE_URL ?? "http://localhost:3000";

if (!firestoreHost || !authHost || process.env.NEXT_PUBLIC_USE_EMULATORS !== "true") {
  console.error("Refusing to run: set FIRESTORE_EMULATOR_HOST, FIREBASE_AUTH_EMULATOR_HOST and NEXT_PUBLIC_USE_EMULATORS=true (see README). This script only ever runs against the emulators.");
  process.exit(1);
}

const ID_NUMBER = "0001155800087"; // a valid adult citizen ID, born 2000-01-15
const ID_SHAPES = [ID_NUMBER, "000115", "2000-01-15"];
const profile = { firstName: "Thabo", area: "Ivory Park", availability: ["saturdays", "sundays"], payoutPhone: "082 123 4567", idNumber: ID_NUMBER };

// The emulator guard in firebaseClient.ts reads the page's hostname; this is the one place a script stands in for a page.
Object.assign(globalThis, { window: { location: { hostname: "localhost" } } });
const auth = clientAuth();
Reflect.deleteProperty(globalThis, "window");

async function clearEmulators(): Promise<void> {
  await fetch(`http://${firestoreHost}/emulator/v1/projects/${PROJECT}/databases/(default)/documents`, { method: "DELETE" });
  await fetch(`http://${authHost}/emulator/v1/projects/${PROJECT}/accounts`, { method: "DELETE" });
}

/** The Auth emulator accepts an unsigned Google credential, so no real Google account is involved. */
async function signInAs(sub: string): Promise<string> {
  await signOut(auth);
  const credential = GoogleAuthProvider.credential(JSON.stringify({ sub, email: `${sub}@example.com`, email_verified: true }));
  return (await signInWithCredential(auth, credential)).user.uid;
}

const post = (path: string, body: unknown) => apiPost(`${BASE}${path}`, body, SaveResultSchema);

async function expectRefusal(path: string, body: unknown): Promise<{ status: number; code: string; message: string }> {
  try {
    await post(path, body);
  } catch (error) {
    if (error instanceof ApiError) return { status: error.status, code: error.code, message: error.message };
    throw error;
  }
  throw new Error(`${path} should have been refused`);
}

async function main(): Promise<void> {
  await clearEmulators();
  const steps: Record<string, unknown> = {};

  const thabo = await signInAs("e2e-thabo");
  steps["1. role"] = await post("/api/profile/role", { role: "young_person" });
  steps["2. role again"] = await post("/api/profile/role", { role: "young_person" });
  steps["3. worker profile"] = await post("/api/profile/worker", profile);
  steps["4. worker profile again"] = await post("/api/profile/worker", profile);
  steps["5. change of role"] = await expectRefusal("/api/profile/role", { role: "business" });

  await signInAs("e2e-lerato");
  await post("/api/profile/role", { role: "young_person" });
  steps["6. same ID, other account"] = await expectRefusal("/api/profile/worker", { ...profile, firstName: "Lerato" });

  const db = getFirestore(initializeAdmin({ projectId: PROJECT }));
  const [user, hashes, audit] = await Promise.all([
    db.doc(`users/${thabo}`).get(),
    db.collection("idHashes").get(),
    db.collection("auditLog").orderBy("at").get(),
  ]);
  const stored = {
    [`users/${thabo}`]: user.data(),
    idHashes: hashes.docs.map((doc) => ({ id: doc.id, ...doc.data() })),
    auditLog: audit.docs.map((doc) => doc.data()),
  };

  console.log(JSON.stringify({ steps, stored }, null, 2));
  const everything = JSON.stringify({ steps, stored });
  const leaks = ID_SHAPES.filter((shape) => everything.includes(shape));
  if (leaks.length > 0) throw new Error(`The ID number or date of birth appears in stored data or responses: ${leaks.join(", ")}`);
  console.log("No trace of the full ID number or date of birth in any response or stored document.");
}

main()
  .then(() => process.exit(0))
  .catch((error: unknown) => {
    console.error(error);
    process.exit(1);
  });
