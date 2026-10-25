import "server-only";
import { FieldValue } from "firebase-admin/firestore";
import { applicationId } from "@/domain/applications";
import { adminDb } from "../firebaseAdmin";
import type { BookingRepository } from "./bookingRepository";
import { appendLedger, readLedger } from "./firestoreLedger";
import { defined, parseBooking, parseSecrets } from "./firestoreRecords";

export const firestoreBookingRepository: BookingRepository = {
  async get(bookingId) {
    const db = adminDb();
    const [booking, secrets] = await Promise.all([db.collection("bookings").doc(bookingId).get(), db.collection("bookingSecrets").doc(bookingId).get()]);
    return booking.exists && secrets.exists ? { booking: parseBooking(booking.data()), secrets: parseSecrets(secrets.data()) } : null;
  },

  async graceCancelsSince(uid, since) {
    // Equality only, filtered here: no composite index needed for a handful of bookings.
    const snapshot = await adminDb().collection("bookings").where("cancellation.byUid", "==", uid).get();
    return snapshot.docs.map((doc) => parseBooking(doc.data())).filter((b) => b.cancellation && b.cancellation.reliedOnGrace && b.cancellation.at >= since).length;
  },

  transactEnding(bookingId, actorUid, plan) {
    const db = adminDb();
    const ref = db.collection("bookings").doc(bookingId);
    return db.runTransaction(async (tx) => {
      const snapshot = await tx.get(ref);
      const booking = snapshot.exists ? parseBooking(snapshot.data()) : null;
      const ownerLedger = booking ? await readLedger(db, tx, booking.ownerId) : [];
      const { write, result } = plan({ booking, ownerLedger });
      if (!write || !booking) return result;
      const at = FieldValue.serverTimestamp();
      tx.update(ref, { ...defined(write.booking), updatedAt: at });
      tx.update(db.collection("tryouts").doc(booking.tryoutId), { status: write.tryoutStatus, updatedAt: at });
      tx.update(db.collection("applications").doc(applicationId(booking.tryoutId, booking.workerId)), { status: write.applicationStatus, updatedAt: at });
      if (write.ledger.length > 0) appendLedger(db, tx, booking.ownerId, ownerLedger.length, write.ledger, actorUid);
      if (write.strike) {
        const uid = write.strike.party === "business" ? booking.ownerId : booking.workerId;
        tx.create(db.collection("strikes").doc(), { uid, party: write.strike.party, reason: write.strike.reason, bookingId, at });
        const counter = write.strike.reason === "no_show" ? "noShows" : "lateCancellations";
        tx.update(db.collection(write.strike.party === "business" ? "businesses" : "users").doc(uid), { [counter]: FieldValue.increment(1), updatedAt: at });
      }
      tx.create(db.collection("auditLog").doc(), { uid: actorUid, action: write.audit, target: bookingId, at });
      return result;
    });
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
