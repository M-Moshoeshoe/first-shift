import "server-only";
import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { z } from "zod";
import { hireOfferId } from "@/domain/hire";
import { adminDb } from "../firebaseAdmin";
import { instant, parseBooking } from "./firestoreRecords";
import type { HireRepository } from "./hireRepository";

const OfferSchema = z.object({ ownerId: z.string(), workerId: z.string(), businessName: z.string(), bookingId: z.string(), demo: z.boolean(), at: instant });

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
      offered: offer.exists,
    };
  },

  create(offer, actorUid) {
    const db = adminDb();
    const ref = db.collection("hireOffers").doc(hireOfferId(offer.ownerId, offer.workerId));
    return db.runTransaction(async (tx) => {
      if ((await tx.get(ref)).exists) return "exists" as const;
      tx.create(ref, { ...offer, at: Timestamp.fromDate(offer.at) });
      tx.create(db.collection("auditLog").doc(), { uid: actorUid, action: "hire_offered", target: ref.id, at: FieldValue.serverTimestamp() });
      return "created" as const;
    });
  },

  async forWorker(workerId) {
    const offers = await adminDb().collection("hireOffers").where("workerId", "==", workerId).get();
    return offers.docs.map((doc) => OfferSchema.parse(doc.data())).sort((a, b) => b.at.getTime() - a.at.getTime());
  },
};
