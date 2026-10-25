import { FieldValue, type DocumentReference, type Query } from "firebase-admin/firestore";
import { z } from "zod";
import { DEMO_ROLES } from "../src/config/demo";
import { DEMO_EXTRA_OWNERS, demoState } from "../src/data/demo";
import { adminDb } from "../src/server/firebaseAdmin";
import { appendLedger } from "../src/server/repositories/firestoreLedger";
import { firestoreTryoutRepository } from "../src/server/repositories/firestoreTryoutRepository";
import { announceTarget } from "./adminTarget";

/**
 * Puts the demo world back to its known state (src/data/demo.ts): Sipho's
 * complete business with 3 free credits, Thabo's complete profile, and four
 * live tryouts in the next three days, all marked demo. Everything the demo
 * accounts made since (tryouts, applications, credits, daily limits) is
 * deleted first. It touches only demo records: the demo accounts' own uids,
 * the two extra demo businesses, and documents marked demo: true. The audit
 * log is kept, with one demo_reset entry per account added to it.
 *
 *   npm run demo:reset          (after npm run demo:accounts)
 */
const RecordedSchema = z.object({ uid: z.string().min(1) });

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

async function main(): Promise<void> {
  announceTarget();
  const db = adminDb();
  const uids = await demoUids();
  const owners = [uids.business, ...DEMO_EXTRA_OWNERS];
  const accounts = [uids.business, uids.youngPerson];

  const removed = await deleteAll(
    await refsOf([
      db.collection("tryouts").where("ownerId", "in", owners),
      db.collection("tryouts").where("demo", "==", true),
      db.collection("applications").where("workerId", "==", uids.youngPerson),
      db.collection("applications").where("ownerId", "in", owners),
      db.collection("applications").where("demo", "==", true),
      db.collection("creditLedger").where("businessId", "in", owners),
      db.collection("rateLimits").where("uid", "in", accounts),
    ]),
  );
  console.log(`Removed ${removed} demo documents.`);

  const state = demoState(uids, new Date());
  const at = FieldValue.serverTimestamp();
  await db.runTransaction(async (tx) => {
    // set without merge: each record becomes exactly the known state, whatever it held before.
    for (const [uid, user] of Object.entries(state.users)) tx.set(db.collection("users").doc(uid), { ...user, updatedAt: at });
    for (const [uid, business] of Object.entries(state.businesses)) tx.set(db.collection("businesses").doc(uid), { ...business, updatedAt: at });
    appendLedger(db, tx, uids.business, 0, state.ledger, uids.business);
    for (const uid of accounts) tx.create(db.collection("auditLog").doc(), { uid, action: "demo_reset", at });
  });
  // Through the same write as posting: each tryout with its own audit entry.
  for (const tryout of state.tryouts) await firestoreTryoutRepository.create(tryout, "tryout_posted");
  console.log(`Restored: ${Object.keys(state.users).length} demo accounts, ${Object.keys(state.businesses).length} businesses, ${state.tryouts.length} live tryouts.`);
}

main().then(
  () => process.exit(0),
  (error: unknown) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  },
);
