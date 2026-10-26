import "server-only";
import { FieldValue, type Firestore, type Timestamp, type Transaction } from "firebase-admin/firestore";
import { applicationId } from "@/domain/applications";
import { adminDb } from "../firebaseAdmin";
import type { BookingRecord } from "@/domain/bookings";
import type { BookingRepository, BookingWrite, Counter } from "./bookingRepository";
import { appendLedger, readLedger } from "./firestoreLedger";
import { defined, parseBooking, parseSecrets } from "./firestoreRecords";

/** Applies one booking step's writes inside its transaction, each with the audit entry. */
function applyBookingWrite(db: Firestore, tx: Transaction, bookingId: string, booking: BookingRecord, ledgerLength: number, actorUid: string, write: BookingWrite): void {
  const at = FieldValue.serverTimestamp();
  if (write.booking) tx.update(db.collection("bookings").doc(bookingId), { ...defined(write.booking), updatedAt: at });
  if (write.codeAttempt) tx.update(db.collection("bookingSecrets").doc(bookingId), { codeAttempts: FieldValue.increment(1) });
  if (write.tryoutStatus) tx.update(db.collection("tryouts").doc(booking.tryoutId), { status: write.tryoutStatus, updatedAt: at });
  if (write.applicationStatus) tx.update(db.collection("applications").doc(applicationId(booking.tryoutId, booking.workerId)), { status: write.applicationStatus, updatedAt: at });
  if (write.ledger?.length) appendLedger(db, tx, booking.ownerId, ledgerLength, write.ledger, actorUid);
  if (write.strike) {
    const uid = write.strike.party === "business" ? booking.ownerId : booking.workerId;
    tx.create(db.collection("strikes").doc(), { uid, party: write.strike.party, reason: write.strike.reason, bookingId, at });
    const counter = write.strike.reason === "no_show" ? "noShows" : "lateCancellations";
    tx.update(db.collection(write.strike.party === "business" ? "businesses" : "users").doc(uid), { [counter]: FieldValue.increment(1), updatedAt: at });
  }
  if (write.review) tx.create(db.collection("cases").doc(), { ...write.review, openedAt: at });
  // The note can hold personal details: it stays on the evidence record, which no client can read, never in the audit log.
  if (write.evidence) tx.create(db.collection("evidence").doc(), { ...write.evidence, at });
  if (write.business) tx.update(db.collection("businesses").doc(booking.ownerId), { ...write.business, updatedAt: at });
  const bump = (counters: readonly Counter[] | undefined) => Object.fromEntries((counters ?? []).map((name) => [name, FieldValue.increment(1)]));
  if (write.counters?.worker?.length) tx.update(db.collection("users").doc(booking.workerId), { ...bump(write.counters.worker), updatedAt: at });
  if (write.counters?.business?.length) tx.update(db.collection("businesses").doc(booking.ownerId), { ...bump(write.counters.business), updatedAt: at });
  tx.create(db.collection("auditLog").doc(), { uid: actorUid, action: write.audit, target: bookingId, at });
}

export const firestoreBookingRepository: BookingRepository = {
  async get(bookingId) {
    const db = adminDb();
    const [booking, secrets] = await Promise.all([db.collection("bookings").doc(bookingId).get(), db.collection("bookingSecrets").doc(bookingId).get()]);
    return booking.exists && secrets.exists ? { booking: parseBooking(booking.data()), secrets: parseSecrets(secrets.data()) } : null;
  },

  async reviews(bookingId, tryoutId) {
    const db = adminDb();
    // A case names its booking one of three ways: a review by its id, a challenged reference by its id (the same), a report by its tryout.
    const snapshots = await Promise.all([
      db.collection("cases").where("bookingId", "==", bookingId).get(),
      db.collection("cases").where("referenceId", "==", bookingId).get(),
      db.collection("cases").where("tryoutId", "==", tryoutId).get(),
    ]);
    const closed = new Map(snapshots.flatMap((snapshot) => snapshot.docs).filter((doc) => doc.get("status") === "closed").map((doc) => [doc.id, doc]));
    return [...closed.values()]
      .map((doc) => ({ closedAt: (doc.get("closedAt") as Timestamp | undefined)?.toDate() ?? new Date(0), outcome: String(doc.get("outcome") ?? "") }))
      .filter((review) => review.outcome !== "")
      .sort((a, b) => a.closedAt.getTime() - b.closedAt.getTime());
  },

  async graceCancelsSince(uid, since) {
    // Equality only, filtered here: no composite index needed for a handful of bookings.
    const snapshot = await adminDb().collection("bookings").where("cancellation.byUid", "==", uid).get();
    return snapshot.docs.map((doc) => parseBooking(doc.data())).filter((b) => b.cancellation && b.cancellation.reliedOnGrace && b.cancellation.at >= since).length;
  },

  transactBooking(bookingId, actorUid, plan) {
    const db = adminDb();
    const ref = db.collection("bookings").doc(bookingId);
    const secretsRef = db.collection("bookingSecrets").doc(bookingId);
    return db.runTransaction(async (tx) => {
      const [snapshot, secretsSnap] = await Promise.all([tx.get(ref), tx.get(secretsRef)]);
      const booking = snapshot.exists ? parseBooking(snapshot.data()) : null;
      const ownerLedger = booking ? await readLedger(db, tx, booking.ownerId) : [];
      const business = booking ? await tx.get(db.collection("businesses").doc(booking.ownerId)) : null;
      const pausedFor = business?.get("pausedFor");
      const { write, result } = plan({ booking, secrets: secretsSnap.exists ? parseSecrets(secretsSnap.data()) : null, ownerLedger, businessPausedFor: typeof pausedFor === "string" ? pausedFor : null });
      if (!write || !booking) return result;
      applyBookingWrite(db, tx, bookingId, booking, ownerLedger.length, actorUid, write);
      return result;
    });
  },

  async awaitingPayment(uid) {
    const db = adminDb();
    const [asOwner, asWorker] = await Promise.all([db.collection("bookings").where("ownerId", "==", uid).get(), db.collection("bookings").where("workerId", "==", uid).get()]);
    return [...asOwner.docs, ...asWorker.docs]
      .map((doc) => ({ id: doc.id, booking: parseBooking(doc.data()) }))
      .filter(({ booking }) => (booking.owedCents ?? 0) > 0 && booking.payment?.state !== "received");
  },

  async report(reviewCase, reporterUid, pauseBusiness) {
    const db = adminDb();
    const ref = db.collection("cases").doc();
    const at = FieldValue.serverTimestamp();
    const batch = db.batch();
    batch.create(ref, { ...reviewCase, openedAt: at });
    // The note can hold personal details: it stays on the case, never in the audit log.
    batch.create(db.collection("auditLog").doc(), { uid: reporterUid, action: "report_opened", target: ref.id, at });
    if (pauseBusiness && reviewCase.kind === "report") {
      batch.update(db.collection("businesses").doc(reviewCase.businessId), { status: "paused", pausedFor: ref.id, updatedAt: at });
      batch.create(db.collection("auditLog").doc(), { uid: reporterUid, action: "business_paused", target: reviewCase.businessId, at });
    }
    await batch.commit();
    return ref.id;
  },

  async byShareToken(token) {
    const db = adminDb();
    const secrets = await db.collection("bookingSecrets").where("shareToken", "==", token).limit(1).get();
    const bookingId = secrets.docs[0]?.get("bookingId");
    if (typeof bookingId !== "string") return null;
    const booking = await db.collection("bookings").doc(bookingId).get();
    return booking.exists ? parseBooking(booking.data()) : null;
  },

  async relation(viewerUid, subjectUid) {
    const db = adminDb();
    const [applied, asOwner, asWorker] = await Promise.all([
      db.collection("applications").where("workerId", "==", subjectUid).where("ownerId", "==", viewerUid).limit(1).get(),
      db.collection("bookings").where("ownerId", "==", viewerUid).where("workerId", "==", subjectUid).limit(1).get(),
      db.collection("bookings").where("ownerId", "==", subjectUid).where("workerId", "==", viewerUid).limit(1).get(),
    ]);
    return { appliedToViewer: !applied.empty, bookedTogether: !asOwner.empty || !asWorker.empty };
  },
};
