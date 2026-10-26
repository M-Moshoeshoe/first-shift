import "server-only";
import { randomBytes } from "node:crypto";
import { FieldValue, type DocumentReference, type Query } from "firebase-admin/firestore";
import { z } from "zod";
import { DEMO_EXAMPLE_APPLICANTS, DEMO_ROLES } from "@/config/demo";
import { DEMO_EXTRA_OWNERS, demoApplication, demoState } from "@/data/demo";
import { exampleApplications } from "@/data/demoApplicants";
import { applicationId } from "@/domain/applications";
import { statusExpiresAt } from "@/domain/bookings";
import { adminBucket, adminDb } from "../firebaseAdmin";
import { ensureDemoPhotos } from "../demoPhotos";
import { defined } from "./firestoreRecords";
import { appendLedger } from "./firestoreLedger";
import { firestoreTryoutRepository } from "./firestoreTryoutRepository";

/**
 * Puts the demo world back to its known state (src/data/demo.ts): Sipho's
 * complete business with its credits, Thabo's complete profile, their two
 * finished tryouts this month, four live tryouts in the next three days, and
 * Thabo's application to Sipho's first one. Everything the demo accounts made
 * since (tryouts, applications, bookings and their secrets, credits, cases,
 * strikes, proof screenshots, references, job offers, daily limits) is
 * deleted first. It touches only demo records: the demo accounts' own uids,
 * the extra demo businesses, and documents marked demo: true. The audit log
 * is kept, with one demo_reset entry per account. Used by npm run demo:reset
 * and by "Reset the demo" in the app.
 */
const RecordedSchema = z.object({ uid: z.string().min(1) });

export interface DemoResetSummary {
  removed: number;
  tryouts: number;
  history: number;
}

async function demoUids(): Promise<{ business: string; youngPerson: string }> {
  const db = adminDb();
  const [business, youngPerson] = await Promise.all(DEMO_ROLES.map((role) => db.collection("demoAccounts").doc(role).get()));
  if (!business?.exists || !youngPerson?.exists) throw new Error("No demo accounts on record. Run npm run demo:accounts first.");
  return { business: RecordedSchema.parse(business.data()).uid, youngPerson: RecordedSchema.parse(youngPerson.data()).uid };
}

/** Deletes in batches under Firestore's 500-write limit, and says how many went. */
async function deleteAll(refs: readonly DocumentReference[]): Promise<number> {
  const unique = [...new Map(refs.map((ref) => [ref.path, ref])).values()];
  for (let start = 0; start < unique.length; start += 400) {
    const batch = adminDb().batch();
    for (const ref of unique.slice(start, start + 400)) batch.delete(ref);
    await batch.commit();
  }
  return unique.length;
}

const refsOf = async (queries: readonly Query[]): Promise<DocumentReference[]> => (await Promise.all(queries.map((q) => q.get()))).flatMap((snapshot) => snapshot.docs.map((doc) => doc.ref));

async function clearDemo(uids: { business: string; youngPerson: string }): Promise<number> {
  const db = adminDb();
  const owners = [uids.business, ...DEMO_EXTRA_OWNERS];
  const accounts = [uids.business, uids.youngPerson];
  // Every demo booking, and with it its secrets (check-in code, share token), found before anything is deleted.
  const bookingRefs = await refsOf([
    db.collection("bookings").where("ownerId", "in", owners),
    db.collection("bookings").where("workerId", "==", uids.youngPerson),
    db.collection("bookings").where("demo", "==", true),
  ]);
  const removed = await deleteAll([
    ...bookingRefs,
    ...bookingRefs.map((ref) => db.collection("bookingSecrets").doc(ref.id)),
    ...(await refsOf([
      db.collection("tryouts").where("ownerId", "in", owners),
      db.collection("tryouts").where("demo", "==", true),
      db.collection("applications").where("workerId", "==", uids.youngPerson),
      db.collection("applications").where("ownerId", "in", owners),
      db.collection("applications").where("demo", "==", true),
      db.collection("creditLedger").where("businessId", "in", owners),
      db.collection("rateLimits").where("uid", "in", accounts),
      db.collection("cases").where("businessId", "in", owners),
      db.collection("cases").where("reporterId", "in", accounts),
      db.collection("strikes").where("uid", "in", accounts),
      db.collection("evidence").where("demo", "==", true),
      db.collection("references").where("workerId", "==", uids.youngPerson),
      db.collection("references").where("demo", "==", true),
      db.collection("hireOffers").where("demo", "==", true),
    ])),
  ]);
  // Screenshots added as proof on demo bookings, at their private paths (domain/evidence.ts). A booking can match
  // more than one query above, so each folder is cleared once: clearing it twice at once fails on the second.
  const bookingIds = new Set(bookingRefs.map((ref) => ref.id));
  await Promise.all([...bookingIds].map((id) => adminBucket().deleteFiles({ prefix: `evidence/${id}/` })));
  return removed;
}

/** referenceText: the seeded reference from the live model, or null for the labelled example (server/demoReference.ts). */
export async function resetDemoWorld(now: Date, referenceText: string | null = null): Promise<DemoResetSummary> {
  const db = adminDb();
  const uids = await demoUids();
  const removed = await clearDemo(uids);

  const state = demoState(uids, now, referenceText);
  const at = FieldValue.serverTimestamp();
  await db.runTransaction(async (tx) => {
    // set without merge: each record becomes exactly the known state, whatever it held before.
    for (const [uid, user] of Object.entries(state.users)) tx.set(db.collection("users").doc(uid), { ...user, updatedAt: at });
    for (const [uid, business] of Object.entries(state.businesses)) tx.set(db.collection("businesses").doc(uid), { ...business, updatedAt: at });
    appendLedger(db, tx, uids.business, 0, state.ledger, uids.business);
    // The history: each past tryout, its booking (with fresh secrets nobody will need) and its reference, if it has one.
    for (const past of state.history) {
      tx.set(db.collection("tryouts").doc(past.tryoutId), { ...past.tryout, createdAt: at, updatedAt: at });
      tx.set(db.collection("bookings").doc(past.bookingId), { ...defined(past.booking), createdAt: at, updatedAt: at });
      const secrets = { checkInCode: String(randomBytes(3).readUIntBE(0, 3) % 1_000_000).padStart(6, "0"), shareToken: randomBytes(18).toString("base64url"), expiresAt: statusExpiresAt(past.booking) };
      tx.set(db.collection("bookingSecrets").doc(past.bookingId), { ...secrets, bookingId: past.bookingId });
      if (past.reference) tx.set(db.collection("references").doc(past.bookingId), { ...past.reference, bookingId: past.bookingId, createdAt: at, updatedAt: at });
    }
    for (const uid of [uids.business, uids.youngPerson]) tx.create(db.collection("auditLog").doc(), { uid, action: "demo_reset", at });
  });
  // Through the same write as posting: each tryout with its own audit entry.
  const ids = await Promise.all(state.tryouts.map((tryout) => firestoreTryoutRepository.create(tryout, "tryout_posted")));
  const [firstId] = ids;
  const [first] = state.tryouts;
  if (firstId && first) {
    // Thabo's application, and the six example applicants beside it (data/demoApplicants.ts).
    const applications = [demoApplication(firstId, first, uids.youngPerson), ...exampleApplications(firstId, first)];
    await db.runTransaction(async (tx) => {
      for (const application of applications) tx.set(db.collection("applications").doc(applicationId(firstId, application.workerId)), { ...application, updatedAt: at });
      tx.update(db.collection("tryouts").doc(firstId), { applicants: applications.length });
      tx.create(db.collection("auditLog").doc(), { uid: uids.youngPerson, action: "application_made", target: applicationId(firstId, uids.youngPerson), at });
    });
  }
  // Every demo face and shopfront has a placeholder, so the door check has a photo to look at.
  await ensureDemoPhotos([
    { uid: uids.youngPerson, kind: "profile" },
    { uid: uids.business, kind: "profile" },
    ...DEMO_EXAMPLE_APPLICANTS.map((uid, index) => ({ uid, kind: "profile" as const, tone: index + 1 })),
    ...[uids.business, ...DEMO_EXTRA_OWNERS].map((uid) => ({ uid, kind: "shopfront" as const })),
  ]);
  return { removed, tryouts: state.tryouts.length, history: state.history.length };
}
