import "server-only";
import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { z } from "zod";
import { HIRE_ANSWERS, HIRE_KINDS, HIRE_OUTCOMES, hireOfferId, type HireOfferRecord } from "@/domain/hire";
import { adminDb } from "../firebaseAdmin";
import { instant, parseBooking } from "./firestoreRecords";
import type { HireRepository } from "./hireRepository";

// Offers recorded before they had a kind, details or answers read as an invitation to talk, unanswered.
const OfferSchema = z.object({
  ownerId: z.string(),
  workerId: z.string(),
  businessName: z.string(),
  bookingId: z.string(),
  demo: z.boolean(),
  at: instant,
  kind: z.enum(HIRE_KINDS).default("talk"),
  details: z.object({ role: z.string(), daysPerWeek: z.number().int(), rateCentsPerHour: z.number().int() }).nullable().default(null),
  message: z.string().default(""),
  answer: z.enum(HIRE_ANSWERS).nullable().default(null),
  outcome: z.enum(HIRE_OUTCOMES).nullable().default(null),
  workerFirstName: z.string().default(""),
  ownerFirstName: z.string().default(""),
  ownerPhone: z.string().nullable().default(null),
});
const parseOffer = (data: unknown): HireOfferRecord => OfferSchema.parse(data);

export const firestoreHireRepository: HireRepository = {
  async pair(ownerId, workerId) {
    const db = adminDb();
    const [bookings, offer] = await Promise.all([
      db.collection("bookings").where("ownerId", "==", ownerId).where("workerId", "==", workerId).get(),
      db.collection("hireOffers").doc(hireOfferId(ownerId, workerId)).get(),
    ]);
    const together = bookings.docs.map((doc) => parseBooking(doc.data()));
    return {
      completed: together.filter((booking) => booking.status === "ended").length,
      // Booked and worked tryouts count towards the line; cancelled ones and no-shows don't (regularEmployment.ts).
      slots: together.filter((booking) => booking.status === "booked" || booking.status === "checked_in" || booking.status === "ended").map((booking) => ({ startAt: booking.startAt, hours: booking.hours })),
      offer: offer.exists ? parseOffer(offer.data()) : null,
    };
  },

  create(offer, actorUid) {
    const db = adminDb();
    const ref = db.collection("hireOffers").doc(hireOfferId(offer.ownerId, offer.workerId));
    return db.runTransaction(async (tx) => {
      if ((await tx.get(ref)).exists) return "exists" as const;
      tx.create(ref, { ...offer, at: Timestamp.fromDate(offer.at) });
      tx.create(db.collection("auditLog").doc(), { uid: actorUid, action: offer.kind === "offer" ? "hire_offered" : "hire_invited", target: ref.id, at: FieldValue.serverTimestamp() });
      return "created" as const;
    });
  },

  transact(offerId, actorUid, plan) {
    const db = adminDb();
    const ref = db.collection("hireOffers").doc(offerId);
    return db.runTransaction(async (tx) => {
      const snapshot = await tx.get(ref);
      const { write, result } = plan(snapshot.exists ? parseOffer(snapshot.data()) : null);
      if (!write || !snapshot.exists) return result;
      const at = FieldValue.serverTimestamp();
      tx.update(ref, "answer" in write ? { answer: write.answer, answeredAt: at } : { outcome: write.outcome, outcomeAt: at });
      tx.create(db.collection("auditLog").doc(), { uid: actorUid, action: write.audit, target: offerId, at });
      return result;
    });
  },

  async forWorker(workerId) {
    const offers = await adminDb().collection("hireOffers").where("workerId", "==", workerId).get();
    return offers.docs.map((doc) => ({ ...parseOffer(doc.data()), id: doc.id })).sort((a, b) => b.at.getTime() - a.at.getTime());
  },
};
