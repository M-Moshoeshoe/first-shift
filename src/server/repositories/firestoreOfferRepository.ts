import "server-only";
import { FieldValue, type Firestore, type Transaction } from "firebase-admin/firestore";
import { applicationId, type ApplicationRecord } from "@/domain/applications";
import type { BookingRecord } from "@/domain/bookings";
import { adminDb } from "../firebaseAdmin";
import { appendLedger, readLedger } from "./firestoreLedger";
import { parseBusiness, parseUser } from "./firestoreProfileRepository";
import { defined, parseApplication, parseBooking } from "./firestoreRecords";
import { parseTryout } from "./firestoreTryoutRepository";
import type { AnswerState, AnswerWrite, OfferRepository } from "./offerRepository";

const ACTIVE_BOOKING: ReadonlySet<BookingRecord["status"]> = new Set(["booked", "checked_in"]);
/** Booked or completed with this business: what counts towards the 24-hour line. */
const COUNTS_TOWARDS_HOURS: ReadonlySet<BookingRecord["status"]> = new Set(["booked", "checked_in", "ended"]);

async function readAnswerState(db: Firestore, tx: Transaction, tryoutId: string, workerId: string): Promise<AnswerState> {
  const tryoutSnap = await tx.get(db.collection("tryouts").doc(tryoutId));
  const tryout = tryoutSnap.exists ? parseTryout(tryoutSnap.data()) : null;
  const ownerId = tryout?.ownerId ?? "";
  const [application, bookings, business, worker, workerApps, tryoutApps, ownerLedger] = await Promise.all([
    tx.get(db.collection("applications").doc(applicationId(tryoutId, workerId))),
    tx.get(db.collection("bookings").where("workerId", "==", workerId)),
    tryout ? tx.get(db.collection("businesses").doc(ownerId)) : Promise.resolve(null),
    tx.get(db.collection("users").doc(workerId)),
    tx.get(db.collection("applications").where("workerId", "==", workerId)),
    tx.get(db.collection("applications").where("tryoutId", "==", tryoutId)),
    tryout ? readLedger(db, tx, ownerId) : Promise.resolve([]),
  ]);
  const booked = bookings.docs.map((doc) => parseBooking(doc.data()));
  return {
    tryout,
    application: application.exists ? parseApplication(application.data()) : null,
    ownerLedger,
    workerBookings: booked.filter((b) => ACTIVE_BOOKING.has(b.status)).map((b) => ({ start: b.startAt, end: b.endAt })),
    pairSlots: booked.filter((b) => b.ownerId === ownerId && COUNTS_TOWARDS_HOURS.has(b.status)).map((b) => ({ startAt: b.startAt, hours: b.hours })),
    business: business?.exists ? parseBusiness(business.data()) : null,
    worker: worker.exists ? parseUser(worker.data()) : null,
    workerApplications: workerApps.docs.map((doc) => parseApplication(doc.data())),
    tryoutApplications: tryoutApps.docs.map((doc) => parseApplication(doc.data())).filter((app) => app.workerId !== workerId),
    newBookingId: db.collection("bookings").doc().id,
  };
}

function applyAnswer(db: Firestore, tx: Transaction, state: AnswerState, tryoutId: string, workerId: string, write: AnswerWrite): void {
  const at = FieldValue.serverTimestamp();
  const audit = (action: string, target: string) => tx.create(db.collection("auditLog").doc(), { uid: workerId, action, target, at });
  const appRef = (app: Pick<ApplicationRecord, "tryoutId" | "workerId">) => db.collection("applications").doc(applicationId(app.tryoutId, app.workerId));
  const tryoutRef = db.collection("tryouts").doc(tryoutId);

  if (write.kind === "decline") {
    tx.update(appRef({ tryoutId, workerId }), { status: "declined", updatedAt: at });
    tx.update(tryoutRef, { offer: null, applicants: FieldValue.increment(-1), updatedAt: at });
    audit("offer_declined", applicationId(tryoutId, workerId));
    return;
  }
  const bookingRef = db.collection("bookings").doc(state.newBookingId);
  tx.create(bookingRef, { ...defined(write.booking), createdAt: at, updatedAt: at });
  tx.create(db.collection("bookingSecrets").doc(state.newBookingId), { ...write.secrets, bookingId: state.newBookingId });
  tx.update(tryoutRef, { status: "booked", bookingId: state.newBookingId, offer: null, updatedAt: at });
  tx.update(appRef({ tryoutId, workerId }), { status: "booked", updatedAt: at });
  for (const other of write.notSelected) tx.update(appRef(other), { status: "not_selected", updatedAt: at });
  for (const overlapping of write.withdraw) {
    tx.update(appRef(overlapping), { status: "withdrawn", updatedAt: at });
    // An overlapping offer goes with it, so that owner can offer the tryout to someone else.
    const offerGone = overlapping.status === "offered" ? { offer: null } : {};
    tx.update(db.collection("tryouts").doc(overlapping.tryoutId), { applicants: FieldValue.increment(-1), ...offerGone, updatedAt: at });
    audit("application_withdrawn", applicationId(overlapping.tryoutId, overlapping.workerId));
  }
  if (state.tryout && write.hold.length > 0) appendLedger(db, tx, state.tryout.ownerId, state.ownerLedger.length, write.hold, workerId);
  audit("booking_made", state.newBookingId);
}

export const firestoreOfferRepository: OfferRepository = {
  async tryout(tryoutId) {
    const snapshot = await adminDb().collection("tryouts").doc(tryoutId).get();
    return snapshot.exists ? parseTryout(snapshot.data()) : null;
  },

  async applicants(tryoutId) {
    const db = adminDb();
    const apps = (await db.collection("applications").where("tryoutId", "==", tryoutId).get()).docs.map((doc) => parseApplication(doc.data()));
    if (apps.length === 0) return [];
    const users = await db.getAll(...apps.map((app) => db.collection("users").doc(app.workerId)));
    const byUid = new Map(users.filter((snap) => snap.exists).map((snap) => [snap.id, parseUser(snap.data())]));
    // References arrive with Phase 6; until then nobody has an approved one, and this reads nothing.
    return apps.flatMap((application) => {
      const worker = byUid.get(application.workerId);
      return worker ? [{ application, worker, approvedReferences: 0 }] : [];
    });
  },

  async markSeen(tryoutId, ownerId) {
    const db = adminDb();
    const unseen = await db.collection("applications").where("tryoutId", "==", tryoutId).where("ownerId", "==", ownerId).where("seenByOwner", "==", false).get();
    if (unseen.empty) return;
    const batch = db.batch();
    for (const doc of unseen.docs) batch.update(doc.ref, { seenByOwner: true });
    await batch.commit();
  },

  transactOffer(tryoutId, workerId, plan) {
    const db = adminDb();
    return db.runTransaction(async (tx) => {
      const [tryout, application] = await Promise.all([tx.get(db.collection("tryouts").doc(tryoutId)), tx.get(db.collection("applications").doc(applicationId(tryoutId, workerId)))]);
      const { write, result } = plan({ tryout: tryout.exists ? parseTryout(tryout.data()) : null, application: application.exists ? parseApplication(application.data()) : null });
      if (!write) return result;
      const at = FieldValue.serverTimestamp();
      tx.update(tryout.ref, { offer: { workerId, at: write.at }, updatedAt: at });
      tx.update(application.ref, { status: "offered", offeredAt: write.at, updatedAt: at });
      tx.create(db.collection("auditLog").doc(), { uid: String(tryout.get("ownerId")), action: "offer_made", target: application.id, at });
      return result;
    });
  },

  transactAnswer(tryoutId, workerId, plan) {
    const db = adminDb();
    return db.runTransaction(async (tx) => {
      const state = await readAnswerState(db, tx, tryoutId, workerId);
      const { write, result } = plan(state);
      if (write) applyAnswer(db, tx, state, tryoutId, workerId, write);
      return result;
    });
  },

  async workerApplications(workerId) {
    const db = adminDb();
    const apps = (await db.collection("applications").where("workerId", "==", workerId).get()).docs.map((doc) => parseApplication(doc.data()));
    if (apps.length === 0) return [];
    const tryouts = await db.getAll(...apps.map((app) => db.collection("tryouts").doc(app.tryoutId)));
    const byId = new Map(tryouts.filter((snap) => snap.exists).map((snap) => [snap.id, parseTryout(snap.data())]));
    return apps.map((application) => ({ application, tryout: byId.get(application.tryoutId) ?? null })).sort((a, b) => b.application.startAt.getTime() - a.application.startAt.getTime());
  },

  async badgeInputs(uid, role) {
    const db = adminDb();
    const query =
      role === "business"
        ? db.collection("applications").where("ownerId", "==", uid).where("status", "==", "applied").where("seenByOwner", "==", false)
        : db.collection("applications").where("workerId", "==", uid).where("status", "==", "offered");
    return (await query.get()).docs.map((doc) => parseApplication(doc.data()));
  },
};
