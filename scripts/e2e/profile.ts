import { getFirestore } from "firebase-admin/firestore";
import { adminApp, clearEmulators, post, refusal, requireEmulators, run, signInAs, standInForBrowser } from "./session";

/**
 * Role and young person profile through the real src/lib/api.ts and routes,
 * against the Firestore and Auth emulators. Proves what is stored and that the
 * full ID number and date of birth appear nowhere.
 *
 *   npm run emulators   then   npm run dev   then   npm run e2e:profile   (emulator settings from README)
 */
requireEmulators(["FIRESTORE_EMULATOR_HOST", "FIREBASE_AUTH_EMULATOR_HOST"]);
standInForBrowser();

const ID_NUMBER = "0001155800087"; // a valid adult citizen ID, born 2000-01-15
const ID_SHAPES = [ID_NUMBER, "000115", "2000-01-15"];
const profile = { firstName: "Thabo", area: "Ivory Park", availability: ["saturdays", "sundays"], payoutPhone: "082 123 4567", idNumber: ID_NUMBER };

run(async () => {
  await clearEmulators();
  const steps: Record<string, unknown> = {};

  const thabo = await signInAs("e2e-thabo");
  steps["1. role"] = await post("/api/profile/role", { role: "young_person" });
  steps["2. role again"] = await post("/api/profile/role", { role: "young_person" });
  steps["3. worker profile"] = await post("/api/profile/worker", profile);
  steps["4. worker profile again"] = await post("/api/profile/worker", profile);
  steps["5. change of role"] = await refusal(() => post("/api/profile/role", { role: "business" }));

  await signInAs("e2e-lerato");
  await post("/api/profile/role", { role: "young_person" });
  steps["6. same ID, other account"] = await refusal(() => post("/api/profile/worker", { ...profile, firstName: "Lerato" }));

  const db = getFirestore(adminApp());
  const [user, hashes, audit] = await Promise.all([db.doc(`users/${thabo}`).get(), db.collection("idHashes").get(), db.collection("auditLog").orderBy("at").get()]);
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
});
