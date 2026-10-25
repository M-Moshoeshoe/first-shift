import { execSync } from "node:child_process";
import { randomBytes } from "node:crypto";
import { signInWithCustomToken, signInWithEmailAndPassword, signOut, updateEmail, updatePassword } from "firebase/auth";
import { apiGet, apiPost, apiPostSignedOut } from "../../src/lib/api";
import { clientAuth } from "../../src/lib/firebaseClient";
import { ApplicationResultSchema, NearbySchema, TryoutDetailSchema } from "../../src/schemas/finding";
import { ProfileViewSchema } from "../../src/schemas/profile";
import { DemoTokenSchema } from "../../src/schemas/demo";
import { clearEmulators, post, refusal, requireEmulators, run, signInAs, standInForBrowser } from "./session";

/**
 * The demo accounts, attacked the way anyone holding their public password
 * could: a wrong password, editing the profile, changing the Firebase password
 * and the email from the browser. Sets the accounts up with
 * npm run demo:accounts and demo:reset first, against the emulators only.
 *
 *   npm run emulators   then   npm run dev   then   npm run e2e:demo
 */
requireEmulators(["FIRESTORE_EMULATOR_HOST", "FIREBASE_AUTH_EMULATOR_HOST"]);
standInForBrowser();

// Throwaway accounts for this check: the real demo passwords never appear in the repo.
const THABO = { email: "e2e-thabo@firstshift.demo", password: randomBytes(12).toString("base64url") };
// Fixed arguments only, never input: one command line works on Windows and elsewhere.
const script = (name: string, args: string[] = []) => execSync(["npm run --silent", name, "--", ...args].join(" "), { stdio: "inherit" });

async function demoSignIn(email: string, password: string): Promise<void> {
  const { token } = await apiPostSignedOut("/api/demo/sign-in", { email, password }, DemoTokenSchema);
  await signInWithCustomToken(clientAuth(), token);
}

const profile = () => apiGet("/api/profile", ProfileViewSchema);
const nearby = () => apiGet("/api/tryouts/nearby", NearbySchema);

/** The demo young person sees only demo tryouts and can apply; a real young person sees none of them and can't open or apply to one. */
async function feedIsolation(steps: Record<string, unknown>): Promise<void> {
  const demoFeed = await nearby();
  if (demoFeed.status !== "ok" || demoFeed.items.length !== 4) throw new Error(`The demo feed should hold the 4 demo tryouts: ${JSON.stringify(demoFeed)}`);
  const [first] = demoFeed.items;
  if (!first) throw new Error("no demo tryout");
  steps["8. demo feed"] = demoFeed.items.map((item) => `${item.businessName}, ${item.distance}, ${item.injuryCover}${item.isNew ? ", new" : ""}`);
  steps["9. demo applies to a demo tryout"] = (await apiPost("/api/applications", { tryoutId: first.id, note: "Demo note" }, ApplicationResultSchema)).status;

  await signOut(clientAuth());
  await signInAs("e2e-real-ayanda");
  await post("/api/profile/role", { role: "young_person" });
  await post("/api/profile/worker", { firstName: "Ayanda", area: "Ivory Park", availability: ["saturdays"], payoutPhone: "0821234567", idNumber: "0001155800087" });
  const realFeed = await nearby();
  steps["10. real feed, same area"] = realFeed.status === "ok" ? realFeed.items.length : realFeed;
  if (realFeed.status !== "ok" || realFeed.items.length !== 0) throw new Error("A real young person must never see a demo tryout.");
  steps["11. real opens a demo tryout"] = await refusal(() => apiGet(`/api/tryouts/${first.id}`, TryoutDetailSchema));
  steps["12. real applies to a demo tryout"] = await refusal(() => apiPost("/api/applications", { tryoutId: first.id }, ApplicationResultSchema));
}

run(async () => {
  await clearEmulators();
  script("demo:accounts", ["--business-email", "e2e-sipho@firstshift.demo", "--business-password", randomBytes(12).toString("base64url"), "--young-person-email", THABO.email, "--young-person-password", THABO.password]);
  script("demo:reset");
  const steps: Record<string, unknown> = {};

  steps["1. wrong password"] = await refusal(() => demoSignIn(THABO.email, `${THABO.password}x`));
  await demoSignIn(THABO.email.toUpperCase(), THABO.password);
  const view = await profile();
  steps["2. signed in"] = { destination: view.destination, complete: view.complete, firstName: view.worker?.firstName };
  if (view.destination !== "/work" || !view.complete) throw new Error("The demo young person should land on /work with a complete profile.");

  steps["3. edit the demo profile"] = await refusal(() => post("/api/profile/worker", { firstName: "Hacker", area: "Tembisa", availability: ["saturdays"], payoutPhone: "0821234567", idNumber: "0001155800087" }));

  const user = clientAuth().currentUser;
  if (!user) throw new Error("not signed in");
  await updatePassword(user, "taken-over-123");
  await signOut(clientAuth());
  await signInWithEmailAndPassword(clientAuth(), THABO.email, "taken-over-123");
  steps["4. Firebase password changed, then used"] = await refusal(profile);

  await signOut(clientAuth());
  await demoSignIn(THABO.email, THABO.password);
  steps["5. public password still works"] = (await profile()).destination;

  const again = clientAuth().currentUser;
  if (!again) throw new Error("not signed in");
  await updateEmail(again, "taken-over@gmail.com");
  await again.getIdToken(true);
  steps["6. email moved off the demo domain"] = await refusal(profile);

  await signOut(clientAuth());
  await demoSignIn(THABO.email, THABO.password);
  steps["7. next sign-in puts the email back"] = { email: clientAuth().currentUser?.email, destination: (await profile()).destination };

  await feedIsolation(steps);

  console.log(JSON.stringify(steps, null, 2));
  const refused = ["1. wrong password", "3. edit the demo profile", "4. Firebase password changed, then used", "6. email moved off the demo domain", "11. real opens a demo tryout", "12. real applies to a demo tryout"].map((key) => (steps[key] as { status: number }).status);
  if (!refused.every((status) => status === 401 || status === 403 || status === 404)) throw new Error(`Expected every attack refused, got ${refused.join(", ")}`);
  console.log("Every attack on the demo account was refused, the public password still signs in, and demo and real tryouts never meet.");
});
