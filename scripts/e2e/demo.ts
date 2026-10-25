import { execSync } from "node:child_process";
import { randomBytes } from "node:crypto";
import { signInWithCustomToken, signInWithEmailAndPassword, signOut, updateEmail, updatePassword } from "firebase/auth";
import { apiGet, apiPost, apiPostSignedOut } from "../../src/lib/api";
import { clientAuth } from "../../src/lib/firebaseClient";
import { ApplicationResultSchema, NearbySchema, TryoutDetailSchema } from "../../src/schemas/finding";
import { ProfileViewSchema } from "../../src/schemas/profile";
import { DemoTokenSchema } from "../../src/schemas/demo";
import * as z from "zod/mini";
import { ApplicationsSchema, BookingViewSchema, StepResultSchema } from "../../src/schemas/booking";
import { getStorage } from "firebase-admin/storage";
import { adminApp, clearEmulators, post, refusal, requireEmulators, run, signInAs, standInForBrowser, startNow } from "./session";

/**
 * The demo accounts, attacked the way anyone holding their public password
 * could: a wrong password, editing the profile, changing the Firebase password
 * and the email from the browser. Sets the accounts up with
 * npm run demo:accounts and demo:reset first, against the emulators only.
 *
 *   npm run emulators   then   npm run dev   then   npm run e2e:demo
 */
requireEmulators(["FIRESTORE_EMULATOR_HOST", "FIREBASE_AUTH_EMULATOR_HOST", "FIREBASE_STORAGE_EMULATOR_HOST"]);
standInForBrowser();

// Throwaway accounts for this check: the real demo passwords never appear in the repo.
const THABO = { email: "e2e-thabo@firstshift.demo", password: randomBytes(12).toString("base64url") };
const SIPHO = { email: "e2e-sipho@firstshift.demo", password: randomBytes(12).toString("base64url") };
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
  steps["8. demo feed"] = demoFeed.items.map((item) => `${item.businessName}, ${item.distance}, ${item.injuryCover}, ${item.payRecord}`);
  steps["9. demo applies to a demo tryout"] = (await apiPost("/api/applications", { tryoutId: first.id, note: "Demo note" }, ApplicationResultSchema)).status;

  await signOut(clientAuth());
  await signInAs("e2e-real-ayanda");
  await post("/api/profile/role", { role: "young_person" });
  await post("/api/profile/worker", { firstName: "Ayanda", area: "Ivory Park", availability: ["saturdays"], payoutPhone: "0821234567", payMethods: ["ewallet"], idNumber: "0001155800087" });
  const realFeed = await nearby();
  steps["10. real feed, same area"] = realFeed.status === "ok" ? realFeed.items.length : realFeed;
  if (realFeed.status !== "ok" || realFeed.items.length !== 0) throw new Error("A real young person must never see a demo tryout.");
  steps["11. real opens a demo tryout"] = await refusal(() => apiGet(`/api/tryouts/${first.id}`, TryoutDetailSchema));
  steps["12. real applies to a demo tryout"] = await refusal(() => apiPost("/api/applications", { tryoutId: first.id }, ApplicationResultSchema));
}

const AnswerSchema = z.object({ status: z.string(), state: z.object({ kind: z.string(), bookingId: z.optional(z.string()) }) });
const step = (path: string, body: unknown = {}) => apiPost(path, body, StepResultSchema);

/** A whole demo tryout, as a judge would walk it: Sipho offers it to Thabo, Thabo accepts, the day runs, Sipho pays, Thabo confirms. */
async function demoDay(steps: Record<string, unknown>): Promise<string> {
  await signOut(clientAuth());
  await demoSignIn(THABO.email, THABO.password);
  const thaboUid = clientAuth().currentUser?.uid ?? "";
  const seeded = (await apiGet("/api/applications", ApplicationsSchema)).items.find((item) => item.businessName === "Sipho's Phone Repairs" && item.status === "applied");
  if (!seeded) throw new Error("demo:reset should leave Thabo's application to Sipho's first tryout");

  await signOut(clientAuth());
  await demoSignIn(SIPHO.email, SIPHO.password);
  await apiPost(`/api/tryouts/${seeded.tryoutId}/offer`, { workerId: thaboUid }, z.object({ status: z.string() }));

  await signOut(clientAuth());
  await demoSignIn(THABO.email, THABO.password);
  const answered = await apiPost(`/api/applications/${seeded.tryoutId}/answer`, { answer: "accept" }, AnswerSchema);
  const bookingId = answered.state.bookingId ?? "";
  const code = await startNow(bookingId);

  await signOut(clientAuth());
  await demoSignIn(SIPHO.email, SIPHO.password);
  await step(`/api/bookings/${bookingId}/check-in`, { code, faceMatches: true, nameMatches: true, lastFourMatches: true });
  await step(`/api/bookings/${bookingId}/check-out`, { reason: "completed" });
  const owed = (await apiGet(`/api/bookings/${bookingId}`, BookingViewSchema)).day.owedCents;
  await step(`/api/bookings/${bookingId}/paid`, { method: "ewallet", amountCents: owed });

  await signOut(clientAuth());
  await demoSignIn(THABO.email, THABO.password);
  await step(`/api/bookings/${bookingId}/confirm`, { received: true });
  const final = await apiGet(`/api/bookings/${bookingId}`, BookingViewSchema);
  steps["13. demo tryout, offer to Received"] = { booked: answered.status, status: final.status, owed: final.day.owedCents, payment: final.day.payment?.state };
  if (final.day.payment?.state !== "received") throw new Error("The demo tryout should end at Received.");
  return seeded.tryoutId;
}

// A PNG's first bytes: what the server reads to tell a picture from anything else (domain/evidence.ts).
const SCREENSHOT = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, ...new Array(256).fill(7)]).toString("base64");

/** A second demo tryout that ends in a dispute: paid in cash, Not received, then one screenshot from each side, and no more. */
async function demoDispute(steps: Record<string, unknown>, firstTryoutId: string): Promise<void> {
  await signOut(clientAuth());
  await demoSignIn(THABO.email, THABO.password);
  const thaboUid = clientAuth().currentUser?.uid ?? "";
  const feed = await nearby();
  const second = feed.status === "ok" ? feed.items.find((item) => item.businessName === "Sipho's Phone Repairs" && item.id !== firstTryoutId) : undefined;
  if (!second) throw new Error("demo:reset should leave Sipho a second tryout");
  await apiPost("/api/applications", { tryoutId: second.id }, ApplicationResultSchema);

  await signOut(clientAuth());
  await demoSignIn(SIPHO.email, SIPHO.password);
  await apiPost(`/api/tryouts/${second.id}/offer`, { workerId: thaboUid }, z.object({ status: z.string() }));
  await signOut(clientAuth());
  await demoSignIn(THABO.email, THABO.password);
  const bookingId = (await apiPost(`/api/applications/${second.id}/answer`, { answer: "accept" }, AnswerSchema)).state.bookingId ?? "";
  const code = await startNow(bookingId);

  await signOut(clientAuth());
  await demoSignIn(SIPHO.email, SIPHO.password);
  await step(`/api/bookings/${bookingId}/check-in`, { code, faceMatches: true, nameMatches: true, lastFourMatches: true });
  await step(`/api/bookings/${bookingId}/check-out`, { reason: "completed" });
  const owed = (await apiGet(`/api/bookings/${bookingId}`, BookingViewSchema)).day.owedCents;
  const evidenceBefore = await refusal(() => step(`/api/bookings/${bookingId}/evidence`, { image: SCREENSHOT }));
  await step(`/api/bookings/${bookingId}/paid`, { method: "cash", amountCents: owed });

  await signOut(clientAuth());
  await demoSignIn(THABO.email, THABO.password);
  await step(`/api/bookings/${bookingId}/confirm`, { received: false });
  const notImage = await refusal(() => step(`/api/bookings/${bookingId}/evidence`, { image: Buffer.from("<svg onload=alert(1)>").toString("base64") }));
  await step(`/api/bookings/${bookingId}/evidence`, { image: SCREENSHOT, note: "Nothing in my hand at 16:00" });
  const twice = await refusal(() => step(`/api/bookings/${bookingId}/evidence`, { image: SCREENSHOT }));
  await signOut(clientAuth());
  await demoSignIn(SIPHO.email, SIPHO.password);
  await step(`/api/bookings/${bookingId}/evidence`, { image: SCREENSHOT, note: "I handed over R" + owed / 100 });
  const [files] = await getStorage(adminApp()).bucket().getFiles({ prefix: `evidence/${bookingId}/` });
  steps["14. dispute: proof after Not received"] = { beforeNotReceived: evidenceBefore.status, twice: twice.status, notAnImage: notImage.status, filesStored: files.length };
  if (evidenceBefore.status !== 409 || twice.status !== 409 || notImage.status !== 422 || files.length !== 2) throw new Error(`Proof should be refused before Not received, taken once from each side, and stored privately: ${JSON.stringify(steps["14. dispute: proof after Not received"])}`);
}

run(async () => {
  await clearEmulators();
  script("demo:accounts", ["--business-email", SIPHO.email, "--business-password", SIPHO.password, "--young-person-email", THABO.email, "--young-person-password", THABO.password]);
  script("demo:reset");
  const steps: Record<string, unknown> = {};

  steps["1. wrong password"] = await refusal(() => demoSignIn(THABO.email, `${THABO.password}x`));
  await demoSignIn(THABO.email.toUpperCase(), THABO.password);
  const view = await profile();
  steps["2. signed in"] = { destination: view.destination, complete: view.complete, firstName: view.worker?.firstName };
  if (view.destination !== "/work" || !view.complete) throw new Error("The demo young person should land on /work with a complete profile.");

  steps["3. edit the demo profile"] = await refusal(() => post("/api/profile/worker", { firstName: "Hacker", area: "Tembisa", availability: ["saturdays"], payoutPhone: "0821234567", payMethods: ["ewallet"], idNumber: "0001155800087" }));
  steps["3b. change the demo's pay methods"] = await refusal(() => post("/api/profile/worker/edit", { payMethods: ["cash"] }));

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
  const first = await demoDay(steps);
  await demoDispute(steps, first);

  console.log(JSON.stringify(steps, null, 2));
  const refused = ["1. wrong password", "3. edit the demo profile", "3b. change the demo's pay methods", "4. Firebase password changed, then used", "6. email moved off the demo domain", "11. real opens a demo tryout", "12. real applies to a demo tryout"].map((key) => (steps[key] as { status: number }).status);
  if (!refused.every((status) => status === 401 || status === 403 || status === 404)) throw new Error(`Expected every attack refused, got ${refused.join(", ")}`);
  console.log("Every attack on the demo account was refused, the public password still signs in, and demo and real tryouts never meet.");
});
