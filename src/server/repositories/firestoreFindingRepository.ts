import "server-only";
import { FieldValue, type DocumentReference, type DocumentSnapshot, type Firestore, type Transaction } from "firebase-admin/firestore";
import { z } from "zod";
import { applicationId } from "@/domain/applications";
import { COIDA_ANSWERS } from "@/domain/injuryCover";
import type { Listing } from "@/domain/nearby";
import type { TryoutRecord } from "@/domain/tryoutDecisions";
import { adminDb } from "../firebaseAdmin";
import type { ApplicationState, FindingRepository } from "./findingRepository";
import { instant, parseApplication } from "./firestoreRecords";
import { parseTryout } from "./firestoreTryoutRepository";

// Stored documents are parsed on the way in, so a malformed record fails loudly instead of being trusted.
const BookingSchema = z.object({ startAt: instant, endAt: instant });
/** Only what the feed shows about a business: its track record and its injury cover answer. Never its pin. */
const BusinessSummarySchema = z.object({ completed: z.number().int().min(0), coida: z.enum(COIDA_ANSWERS).optional() });

/** The businesses behind these tryouts, read in one round trip. A missing business counts as new, with cover not confirmed. */
async function withBusinesses(db: Firestore, tryouts: readonly { id: string; tryout: TryoutRecord }[]): Promise<Listing[]> {
  const owners = [...new Set(tryouts.map(({ tryout }) => tryout.ownerId))];
  const snapshots = owners.length > 0 ? await db.getAll(...owners.map((owner) => db.collection("businesses").doc(owner))) : [];
  const summaries = new Map(snapshots.map((snapshot) => [snapshot.id, snapshot.exists ? BusinessSummarySchema.parse(snapshot.data()) : { completed: 0 }]));
  return tryouts.map(({ id, tryout }) => ({ id, tryout, business: summaries.get(tryout.ownerId) ?? { completed: 0 } }));
}

async function readState(db: Firestore, tryoutId: string, workerId: string, tx?: Transaction): Promise<ApplicationState> {
  const get = (ref: DocumentReference): Promise<DocumentSnapshot> => (tx ? tx.get(ref) : ref.get());
  const bookingsQuery = db.collection("bookings").where("workerId", "==", workerId).where("status", "==", "booked");
  const [tryout, application, bookings] = await Promise.all([
    get(db.collection("tryouts").doc(tryoutId)),
    get(db.collection("applications").doc(applicationId(tryoutId, workerId))),
    tx ? tx.get(bookingsQuery) : bookingsQuery.get(),
  ]);
  return {
    tryout: tryout.exists ? parseTryout(tryout.data()) : null,
    application: application.exists ? parseApplication(application.data()) : null,
    bookings: bookings.docs.map((doc) => BookingSchema.parse(doc.data())).map(({ startAt, endAt }) => ({ start: startAt, end: endAt })),
  };
}

export const firestoreFindingRepository: FindingRepository = {
  async publishedIn(bounds, areas) {
    const db = adminDb();
    const published = db.collection("tryouts").where("status", "==", "published");
    // One range query per geohash range, and one for the route areas (both indexed: firestore.indexes.json).
    // Firestore takes up to 30 values in one "in"; nobody's area has that many routes.
    const snapshots = await Promise.all([
      ...bounds.map(([start, end]) => published.orderBy("location.geohash").startAt(start).endAt(end).get()),
      ...(areas.length > 0 ? [published.where("area", "in", areas.slice(0, 30)).get()] : []),
    ]);
    const tryouts = snapshots.flatMap((snapshot) => snapshot.docs.map((doc) => ({ id: doc.id, tryout: parseTryout(doc.data()) })));
    return withBusinesses(db, tryouts);
  },

  async listing(id) {
    const db = adminDb();
    const snapshot = await db.collection("tryouts").doc(id).get();
    if (!snapshot.exists) return null;
    const [listing] = await withBusinesses(db, [{ id, tryout: parseTryout(snapshot.data()) }]);
    return listing ?? null;
  },

  read(tryoutId, workerId) {
    return readState(adminDb(), tryoutId, workerId);
  },

  transact(tryoutId, workerId, plan) {
    const db = adminDb();
    return db.runTransaction(async (tx) => {
      const { write, result } = plan(await readState(db, tryoutId, workerId, tx));
      if (!write) return result;
      const at = FieldValue.serverTimestamp();
      const id = applicationId(tryoutId, workerId);
      tx.set(db.collection("applications").doc(id), { ...write.application, updatedAt: at });
      tx.update(db.collection("tryouts").doc(tryoutId), { applicants: FieldValue.increment(write.applicantsDelta), updatedAt: at });
      // The audit entry holds no personal data: who, what, which application and when. The note stays on the application.
      tx.create(db.collection("auditLog").doc(), { uid: workerId, action: write.audit, target: id, at });
      return result;
    });
  },
};
