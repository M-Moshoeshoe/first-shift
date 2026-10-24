import { getFirestore } from "firebase-admin/firestore";
import { getStorage } from "firebase-admin/storage";
import { ref, uploadBytes } from "firebase/storage";
import { clientStorage } from "../../src/lib/firebaseStorage";
import { savePhoto } from "../../src/lib/photos";
import { adminApp, clearEmulators, post, refusal, requireEmulators, run, signInAs, standInForBrowser } from "./session";

/**
 * The photo route against the Storage emulator, with real uploads. Two layers
 * are checked separately: storage.rules refuses a bad upload from the browser,
 * and if a bad file reaches Storage anyway, the route refuses to record it.
 *
 *   npm run emulators   then   npm run dev   then   npm run e2e:photo   (emulator settings from README)
 */
requireEmulators(["FIRESTORE_EMULATOR_HOST", "FIREBASE_AUTH_EMULATOR_HOST", "FIREBASE_STORAGE_EMULATOR_HOST"]);
standInForBrowser();

// The smallest valid JPEG: 1 x 1 pixel.
const TINY_JPEG = Buffer.from(
  "/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA=",
  "base64",
);
const TEXT_FILE = Buffer.from("<html>not a photo</html>");
const OVER_2_MB = Buffer.alloc(2 * 1024 * 1024 + 512 * 1024, 0xff);

run(async () => {
  await clearEmulators();
  const uid = await signInAs("e2e-ayanda");
  await post("/api/profile/role", { role: "young_person" });
  await post("/api/profile/worker", { firstName: "Ayanda", area: "Tembisa", availability: ["saturdays"], payoutPhone: "0731234567", idNumber: "0001155800087" });

  const path = `photos/${uid}/profile.jpg`;
  const bucket = getStorage(adminApp()).bucket();
  const browserUpload = (bytes: Buffer, contentType: string) => uploadBytes(ref(clientStorage(), path), bytes, { contentType });
  // The Admin SDK skips storage.rules, standing in for a file that got past them somehow.
  const sneakIn = (bytes: Buffer, contentType: string) => bucket.file(path).save(bytes, { contentType });
  const record = () => post("/api/profile/photo", { kind: "profile" });
  const results: Record<string, unknown> = {};

  results["1. no photo uploaded yet"] = await refusal(record);
  results["2. browser uploads a non-image"] = await refusal(() => browserUpload(TEXT_FILE, "text/html"));
  await sneakIn(TEXT_FILE, "text/html");
  results["3. route asked to record a non-image"] = await refusal(record);
  results["4. browser uploads 2.5 MB"] = await refusal(() => browserUpload(OVER_2_MB, "image/jpeg"));
  await sneakIn(OVER_2_MB, "image/jpeg");
  results["5. route asked to record 2.5 MB"] = await refusal(record);

  const db = getFirestore(adminApp());
  results["6. stored after the refusals"] = (await db.doc(`users/${uid}`).get()).get("profilePhoto") ?? "nothing";
  results["7. real photo through savePhoto (src/lib/photos.ts)"] = await savePhoto(uid, "profile", new Blob([TINY_JPEG], { type: "image/jpeg" }));
  const [meta] = await bucket.file(path).getMetadata();
  results["8. stored file"] = { contentType: meta.contentType, size: Number(meta.size) };
  results["9. stored on the profile"] = (await db.doc(`users/${uid}`).get()).get("profilePhoto");
  results["10. audit"] = (await db.collection("auditLog").where("uid", "==", uid).get()).docs.map((doc) => doc.get("action"));

  console.log(JSON.stringify(results, null, 2));
});
