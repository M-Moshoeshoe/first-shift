import "server-only";
import { FieldValue } from "firebase-admin/firestore";
import { z } from "zod";
import { HIRE_OUTCOMES } from "@/domain/hire";
import { REFERENCE_STATUSES, type ReferenceRecord } from "@/domain/references";
import { adminDb } from "../firebaseAdmin";
import { parseBooking } from "./firestoreRecords";
import type { ReferenceRepository } from "./referenceRepository";

// Stored documents are parsed on the way in, so a malformed record fails loudly instead of being trusted.
const ReferenceSchema = z.object({
  workerId: z.string(),
  ownerId: z.string(),
  tryoutId: z.string(),
  answers: z.object({ onTime: z.boolean(), didTheWork: z.boolean(), wouldHireAgain: z.boolean() }),
  tasks: z.array(z.string()),
  text: z.string(),
  status: z.enum(REFERENCE_STATUSES),
  demo: z.boolean(),
  challengeRejected: z.boolean().optional(),
});
const parseReference = (data: unknown): ReferenceRecord => ReferenceSchema.parse(data);
const TasksSchema = z.object({ tasks: z.array(z.string()) });
// What the record shows of a job offer: who made it, and whether it ended in a hire (hire.ts).
const JobSchema = z.object({ businessName: z.string(), outcome: z.enum(HIRE_OUTCOMES).nullable().default(null) });

export const firestoreReferenceRepository: ReferenceRepository = {
  async forBooking(bookingId) {
    const db = adminDb();
    const [booking, reference] = await Promise.all([db.collection("bookings").doc(bookingId).get(), db.collection("references").doc(bookingId).get()]);
    const parsed = booking.exists ? parseBooking(booking.data()) : null;
    const tryout = parsed ? await db.collection("tryouts").doc(parsed.tryoutId).get() : null;
    return { booking: parsed, reference: reference.exists ? parseReference(reference.data()) : null, tasks: tryout?.exists ? TasksSchema.parse(tryout.data()).tasks : [] };
  },

  create(bookingId, reference, actorUid) {
    const db = adminDb();
    const ref = db.collection("references").doc(bookingId);
    return db.runTransaction(async (tx) => {
      const existing = await tx.get(ref);
      if (existing.exists) return parseReference(existing.data());
      const at = FieldValue.serverTimestamp();
      tx.create(ref, { ...reference, bookingId, createdAt: at, updatedAt: at });
      // The audit entry holds no personal data and none of the wording.
      tx.create(db.collection("auditLog").doc(), { uid: actorUid, action: "reference_drafted", target: bookingId, at });
      return reference;
    });
  },

  transactDecide(referenceId, actorUid, plan) {
    const db = adminDb();
    const ref = db.collection("references").doc(referenceId);
    return db.runTransaction(async (tx) => {
      const snapshot = await tx.get(ref);
      const { write, result } = plan(snapshot.exists ? parseReference(snapshot.data()) : null);
      if (!write || !snapshot.exists) return result;
      const at = FieldValue.serverTimestamp();
      tx.update(ref, { status: write.status, updatedAt: at, ...(write.review ? { challengedAt: at } : {}) });
      if (write.review) tx.create(db.collection("cases").doc(), { ...write.review, openedAt: at });
      tx.create(db.collection("auditLog").doc(), { uid: actorUid, action: write.audit, target: referenceId, at });
      return result;
    });
  },

  async workerRecord(workerId) {
    const db = adminDb();
    const [user, bookings, references, offers] = await Promise.all([
      db.collection("users").doc(workerId).get(),
      db.collection("bookings").where("workerId", "==", workerId).get(),
      db.collection("references").where("workerId", "==", workerId).get(),
      db.collection("hireOffers").where("workerId", "==", workerId).get(),
    ]);
    return {
      firstName: String(user.get("firstName") ?? ""),
      bookings: bookings.docs.map((doc) => ({ id: doc.id, booking: parseBooking(doc.data()) })),
      references: new Map(references.docs.map((doc) => [doc.id, parseReference(doc.data())])),
      jobs: offers.docs.map((doc) => JobSchema.parse(doc.data())),
    };
  },

  shareToken(workerId, fresh) {
    const db = adminDb();
    const ref = db.collection("users").doc(workerId);
    return db.runTransaction(async (tx) => {
      const current = (await tx.get(ref)).get("recordToken");
      if (typeof current === "string") return current;
      tx.update(ref, { recordToken: fresh, updatedAt: FieldValue.serverTimestamp() });
      tx.create(db.collection("auditLog").doc(), { uid: workerId, action: "record_share_link_made", at: FieldValue.serverTimestamp() });
      return fresh;
    });
  },

  async byShareToken(token) {
    const found = await adminDb().collection("users").where("recordToken", "==", token).limit(1).get();
    return found.docs[0]?.id ?? null;
  },
};
