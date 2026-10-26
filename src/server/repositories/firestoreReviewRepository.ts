import "server-only";
import { FieldValue, Timestamp, type DocumentSnapshot, type Firestore } from "firebase-admin/firestore";
import type { ReviewCase } from "@/domain/cases";
import { caseParties } from "@/domain/review";
import { adminDb } from "../firebaseAdmin";
import { parseBooking } from "./firestoreRecords";
import type { CaseContext, OpenCase, ReviewRepository } from "./reviewRepository";

const at = (value: unknown): Date => (value instanceof Timestamp ? value.toDate() : new Date(0));
const detailOf = (data: Record<string, unknown>): string => String(data.category ?? data.reason ?? data.kind ?? "");

// Cases are written only by the server, in the shapes domain/cases.ts defines.
const asCase = (doc: DocumentSnapshot): OpenCase => {
  const data = doc.data() ?? {};
  return { id: doc.id, item: data as unknown as ReviewCase, openedAt: at(data.openedAt), demo: Boolean(data.demo) };
};

/** The booking a case is about, when it is about one: named on it, the reference's own id, or the tryout's booking. */
async function bookingFor(db: Firestore, item: ReviewCase): Promise<string | null> {
  if (item.kind === "booking_review") return item.bookingId;
  if (item.kind === "reference_challenge") return item.referenceId;
  if (item.kind !== "report") return null;
  const tryout = await db.collection("tryouts").doc(item.tryoutId).get();
  const id = tryout.get("bookingId");
  return typeof id === "string" ? id : null;
}

async function readContext(db: Firestore, doc: DocumentSnapshot): Promise<CaseContext | null> {
  if (!doc.exists) return null;
  const base = asCase(doc);
  const bookingId = await bookingFor(db, base.item);
  const bookingDoc = bookingId ? await db.collection("bookings").doc(bookingId).get() : null;
  const booking = bookingDoc?.exists ? parseBooking(bookingDoc.data()) : null;
  const parties = caseParties(base.item, booking?.workerId ?? null);
  const uids = [parties.businessId, parties.workerId].filter((uid): uid is string => Boolean(uid));
  const [users, businesses, reference, evidence, strikes, ...earlier] = await Promise.all([
    db.getAll(...uids.map((uid) => db.collection("users").doc(uid))),
    db.collection("businesses").doc(parties.businessId).get(),
    bookingId ? db.collection("references").doc(bookingId).get() : null,
    bookingId ? db.collection("evidence").where("bookingId", "==", bookingId).get() : null,
    db.collection("strikes").where("uid", "in", uids).get(),
    db.collection("cases").where("businessId", "==", parties.businessId).get(),
    ...(parties.workerId ? [db.collection("cases").where("workerId", "==", parties.workerId).get(), db.collection("cases").where("reporterId", "==", parties.workerId).get()] : []),
  ]);
  const history = [...new Map(earlier.flatMap((snapshot) => snapshot.docs).filter((other) => other.id !== doc.id).map((other) => [other.id, other])).values()]
    .map((other) => ({ id: other.id, kind: String(other.get("kind")), detail: detailOf(other.data() ?? {}), status: String(other.get("status")), openedAt: at(other.get("openedAt")) }))
    .sort((a, b) => b.openedAt.getTime() - a.openedAt.getTime());
  return {
    ...base,
    bookingId,
    booking,
    parties,
    users: Object.fromEntries(users.filter((user) => user.exists).map((user) => [user.id, user.data() ?? {}])),
    businesses: businesses.exists ? { [businesses.id]: businesses.data() ?? {} } : {},
    reference: reference?.exists ? (reference.data() ?? null) : null,
    evidence: evidence?.docs.map((item) => item.data()) ?? [],
    history,
    strikes: strikes.docs.map((strike) => ({ id: strike.id, uid: String(strike.get("uid")), reason: String(strike.get("reason")), overturned: Boolean(strike.get("overturned")), at: at(strike.get("at")) })),
  };
}

export const firestoreReviewRepository: ReviewRepository = {
  async open() {
    const open = await adminDb().collection("cases").where("status", "==", "open").get();
    return open.docs.map(asCase);
  },

  async context(caseId) {
    const db = adminDb();
    return readContext(db, await db.collection("cases").doc(caseId).get());
  },

  async transactResolve(caseId, plan) {
    const db = adminDb();
    const ref = db.collection("cases").doc(caseId);
    // The context is read first (it spans many queries); the transaction then reads the case again, so it can't be resolved twice.
    const context = await readContext(db, await ref.get());
    return db.runTransaction(async (tx) => {
      const fresh = await tx.get(ref);
      const { write, result } = plan(context && fresh.exists ? { ...context, item: { ...context.item, status: fresh.get("status") } as ReviewCase } : null);
      if (!write) return result;
      const now = FieldValue.serverTimestamp();
      const actor = `admin:${write.admin}`;
      const audit = (action: string, target: string) => tx.create(db.collection("auditLog").doc(), { uid: actor, action, target, reason: write.reason, at: now });
      for (const change of write.status) {
        const collection = change.party === "business" ? "businesses" : "users";
        tx.update(db.collection(collection).doc(change.uid), { status: change.to, ...(change.party === "business" ? { pausedFor: change.to === "paused" ? caseId : null } : {}), updatedAt: now });
        audit(change.to === "paused" ? "admin_paused" : "admin_unpaused", change.uid);
      }
      for (const strike of write.strikes) {
        const strikeRef = db.collection("strikes").doc();
        tx.create(strikeRef, { uid: strike.uid, party: strike.party, reason: strike.reason, caseId, at: now, byAdmin: actor });
        audit("admin_strike_added", strikeRef.id);
      }
      for (const id of write.overturn) {
        tx.update(db.collection("strikes").doc(id), { overturned: true, overturnedBy: actor, overturnedAt: now });
        audit("admin_strike_overturned", id);
      }
      if (write.reference) {
        tx.update(db.collection("references").doc(write.reference.id), { status: write.reference.status, ...(write.reference.status === "draft" ? { challengeRejected: true } : {}), updatedAt: now });
        audit(write.reference.status === "withdrawn" ? "admin_challenge_upheld" : "admin_challenge_rejected", write.reference.id);
      }
      tx.update(ref, { status: "closed", outcome: write.outcome, reason: write.reason, closedBy: actor, closedAt: now });
      audit("case_resolved", caseId);
      return result;
    });
  },
};
