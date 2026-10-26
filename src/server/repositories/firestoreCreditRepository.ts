import "server-only";
import { FieldValue, Timestamp, type Firestore, type Transaction } from "firebase-admin/firestore";
import { z } from "zod";
import { adminDb } from "../firebaseAdmin";
import type { CreditRepository, CreditState } from "./creditRepository";
import { appendLedger, parseEntry, readLedger } from "./firestoreLedger";

// The time on a document written with serverTimestamp(); a document read back in the same moment may not have it yet.
const at = (value: unknown): Date => (value instanceof Timestamp ? value.toDate() : new Date());
const BusinessSchema = z.object({ demo: z.boolean().optional() });

const requestsQuery = (db: Firestore, businessId: string) => db.collection("cases").where("kind", "==", "credit_request").where("businessId", "==", businessId);

async function readState(db: Firestore, tx: Transaction, businessId: string): Promise<CreditState> {
  const [business, open] = await Promise.all([tx.get(db.collection("businesses").doc(businessId)), tx.get(requestsQuery(db, businessId).where("status", "==", "open"))]);
  const ledger = business.exists ? await readLedger(db, tx, businessId) : [];
  return {
    isBusiness: business.exists,
    demo: business.exists ? Boolean(BusinessSchema.parse(business.data()).demo) : false,
    ledger,
    open: open.docs.map((doc) => ({ id: doc.id, at: at(doc.get("openedAt")) })),
  };
}

export const firestoreCreditRepository: CreditRepository = {
  async history(businessId) {
    const db = adminDb();
    const [ledgerDocs, requestDocs] = await Promise.all([db.collection("creditLedger").where("businessId", "==", businessId).get(), requestsQuery(db, businessId).get()]);
    const entries = ledgerDocs.docs
      .map((doc) => ({ seq: Number(doc.get("seq")), entry: parseEntry(doc.data()), at: at(doc.get("at")) }))
      .sort((a, b) => a.seq - b.seq)
      .map(({ entry, at: when }) => ({ entry, at: when }));
    const tryoutIds = [...new Set(entries.flatMap(({ entry }) => (entry.kind === "grant" ? [] : [entry.tryoutId])))];
    const tryouts = tryoutIds.length > 0 ? await db.getAll(...tryoutIds.map((id) => db.collection("tryouts").doc(id))) : [];
    const titles = new Map(tryouts.flatMap((doc) => (doc.exists ? [[doc.id, String(doc.get("title"))] as const] : [])));
    const state = await db.runTransaction((tx) => readState(db, tx, businessId));
    return { state, entries, requests: requestDocs.docs.map((doc) => at(doc.get("openedAt"))), titles };
  },

  transactRequest(businessId, plan) {
    const db = adminDb();
    return db.runTransaction(async (tx) => {
      const state = await readState(db, tx, businessId);
      const { write, result } = plan(state);
      if (!write) return result;
      const ref = db.collection("cases").doc();
      tx.create(ref, { kind: "credit_request", businessId, status: "open", demo: state.demo, openedAt: Timestamp.fromDate(write.at) });
      tx.create(db.collection("auditLog").doc(), { uid: businessId, action: "credits_requested", target: ref.id, at: FieldValue.serverTimestamp() });
      return result;
    });
  },

  transactGrant(businessId, plan) {
    const db = adminDb();
    return db.runTransaction(async (tx) => {
      const state = await readState(db, tx, businessId);
      const { write, result } = plan(state);
      if (!write) return result;
      const actor = `admin:${write.admin}`;
      const now = FieldValue.serverTimestamp();
      appendLedger(db, tx, businessId, state.ledger.length, write.entries, actor);
      for (const id of write.close) tx.update(db.collection("cases").doc(id), { status: "closed", closedAt: now, outcome: "credits_granted", reason: write.reason, closedBy: actor });
      // The admin's reason sits on the audit entry: it's about the grant, never a person's details.
      tx.create(db.collection("auditLog").doc(), { uid: actor, action: "admin_credits_granted", target: businessId, reason: write.reason, at: now });
      return result;
    });
  },
};
