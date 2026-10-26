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
import { CreditRequestResultSchema, CreditsViewSchema } from "../../src/schemas/credits";
import { DraftResultSchema, RecordViewSchema } from "../../src/schemas/record";
import { SharedRecordSchema } from "../../src/schemas/sharedRecord";
import { getFirestore } from "firebase-admin/firestore";
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
const scriptOutput = (name: string, args: string[] = []) => execSync(["npm run --silent", name, "--", ...args].join(" "), { encoding: "utf8" });

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
  await post("/api/profile/worker", { firstName: "Ayanda", area: "Ivory Park", availability: ["saturdays"], payoutPhone: "0821234567", payMethods: ["ewallet"], skills: ["cleaning"], languages: ["isixhosa"], intro: "", legalSurname: "Nkosi", idNumber: "0001155800087" });
  const realFeed = await nearby();
  steps["10. real feed, same area"] = realFeed.status === "ok" ? realFeed.items.length : realFeed;
  if (realFeed.status !== "ok" || realFeed.items.length !== 0) throw new Error("A real young person must never see a demo tryout.");
  steps["11. real opens a demo tryout"] = await refusal(() => apiGet(`/api/tryouts/${first.id}`, TryoutDetailSchema));
  steps["12. real applies to a demo tryout"] = await refusal(() => apiPost("/api/applications", { tryoutId: first.id }, ApplicationResultSchema));
}

const ANSWERS = { onTime: true, didTheWork: true, wouldHireAgain: true };
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
  await step(`/api/bookings/${bookingId}/check-out`, { reason: "completed", answers: ANSWERS });
  const owed = (await apiGet(`/api/bookings/${bookingId}`, BookingViewSchema)).day.owedCents;
  await step(`/api/bookings/${bookingId}/paid`, { method: "ewallet", amountCents: owed });

  await signOut(clientAuth());
  await demoSignIn(THABO.email, THABO.password);
  await step(`/api/bookings/${bookingId}/confirm`, { received: true });
  // Phase 6: the reference, written by the real model from Sipho's answers, added to the record and shared.
  await apiPost(`/api/bookings/${bookingId}/reference`, {}, DraftResultSchema);
  await apiPost(`/api/references/${bookingId}`, { action: "approve" }, StepResultSchema);
  const record = await apiGet("/api/record", RecordViewSchema);
  // Signed out, as anyone with the link: a plain request, no token.
  const shared = SharedRecordSchema.parse(await (await fetch(`/api/record/${record.shareToken}`)).json());
  steps["13b. reference and record"] = { entries: record.entries.length, reference: shared.entries[0]?.reference?.text };
  if (!shared.entries[0]?.reference || JSON.stringify(shared).match(/0000|27000000000|Mokoena/)) throw new Error(`The shared record should show the approved reference and nothing private: ${JSON.stringify(shared)}`);
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
  await step(`/api/bookings/${bookingId}/check-out`, { reason: "completed", answers: ANSWERS });
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

/** npm run review:case: the open cases by priority, then the dispute resolved with an unpause, audit-logged; and npm run pilot:metrics, which leaves demo records out. */
async function demoReview(steps: Record<string, unknown>): Promise<void> {
  const listed = scriptOutput("review:case");
  const line = listed.split("\n").find((row) => row.startsWith("payment") && row.includes("booking_review"));
  const caseId = line?.trim().split(/\s+/)[1] ?? "";
  if (!caseId) throw new Error(`review:case should list the Not received case under payment:\n${listed}`);
  const context = scriptOutput("review:case", [caseId]);
  scriptOutput("review:case", [caseId, "resolve", "--outcome", "paid-in-cash-confirmed", "--reason", "both-sides-agree-after-the-screenshots", "--admin", "e2e", "--unpause", "business"]);
  const db = getFirestore(adminApp());
  const closed = await db.collection("cases").doc(caseId).get();
  const business = await db.collection("businesses").doc(String(closed.get("businessId"))).get();
  const audit = await db.collection("auditLog").where("target", "==", caseId).where("action", "==", "case_resolved").get();
  const metrics = scriptOutput("pilot:metrics");
  steps["16. review:case and pilot:metrics"] = { caseId, showsEvidence: context.includes("Nothing in my hand"), status: closed.get("status"), business: business.get("status"), audited: audit.size, metricsLeaveOutDemo: metrics.includes("No real tryouts yet") };
  if (closed.get("status") !== "closed" || business.get("status") !== "active" || audit.size !== 1 || !context.includes("Nothing in my hand") || !metrics.includes("No real tryouts yet")) {
    throw new Error(`review:case should show the evidence, close the case and unpause the business, audited; pilot:metrics should leave demo out: ${JSON.stringify(steps["16. review:case and pilot:metrics"])}`);
  }
}

/** Sipho asks for more credits, an admin grants them with npm run credits:grant (audit-logged), and the request closes. */
async function demoCredits(steps: Record<string, unknown>): Promise<void> {
  await signOut(clientAuth());
  await demoSignIn(SIPHO.email, SIPHO.password);
  const siphoUid = clientAuth().currentUser?.uid ?? "";
  const asked = await apiPost("/api/credits/request", {}, CreditRequestResultSchema);
  const again = await apiPost("/api/credits/request", {}, CreditRequestResultSchema);
  const before = await apiGet("/api/credits", CreditsViewSchema);
  script("credits:grant", [siphoUid, "5", "--reason", "e2e-pilot-grant", "--admin", "e2e"]);
  const after = await apiGet("/api/credits", CreditsViewSchema);
  steps["15. credits: request, then an admin grant"] = { asked: asked.status, again: again.status, before: before.available, after: after.available, open: after.request, latest: after.history[0]?.text };
  if (again.status !== "unchanged" || after.available !== before.available + 5 || after.request !== null || after.history[0]?.text !== "5 credits added by First Shift") throw new Error(`Credits should be requested once and granted: ${JSON.stringify(steps["15. credits: request, then an admin grant"])}`);
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

  steps["3. edit the demo profile"] = await refusal(() => post("/api/profile/worker", { firstName: "Hacker", area: "Tembisa", availability: ["saturdays"], payoutPhone: "0821234567", payMethods: ["ewallet"], skills: ["cleaning"], languages: ["english"], intro: "", legalSurname: "Hacker", idNumber: "0001155800087" }));
  steps["3b. change the demo's pay methods"] = await refusal(() => post("/api/profile/worker/edit", { payMethods: ["cash"], skills: ["cleaning"], languages: ["english"], intro: "" }));

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

  // One tap, no password: each role lands where its account belongs; a made-up role is refused.
  for (const [role, destination] of [["business", "/business"], ["young_person", "/work"]] as const) {
    await signOut(clientAuth());
    const { token } = await apiPostSignedOut("/api/demo/try", { role }, DemoTokenSchema);
    await signInWithCustomToken(clientAuth(), token);
    steps[`7b. one tap as ${role}`] = (await profile()).destination;
    if (steps[`7b. one tap as ${role}`] !== destination) throw new Error(`One tap as ${role} should land on ${destination}`);
  }
  steps["7c. one tap, made-up role"] = await refusal(() => apiPostSignedOut("/api/demo/try", { role: "admin" }, DemoTokenSchema));

  await feedIsolation(steps);
  const first = await demoDay(steps);
  await demoDispute(steps, first);
  await demoCredits(steps);
  await demoReview(steps);

  console.log(JSON.stringify(steps, null, 2));
  const refused = ["1. wrong password", "7c. one tap, made-up role", "3. edit the demo profile", "3b. change the demo's pay methods", "4. Firebase password changed, then used", "6. email moved off the demo domain", "11. real opens a demo tryout", "12. real applies to a demo tryout"].map((key) => (steps[key] as { status: number }).status);
  if (!refused.every((status) => status === 401 || status === 403 || status === 404 || status === 400)) throw new Error(`Expected every attack refused, got ${refused.join(", ")}`);
  console.log("Every attack on the demo account was refused, the public password still signs in, and demo and real tryouts never meet.");
});
