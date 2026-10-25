import "server-only";
import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { z } from "zod";
import { ALLOWED_CATEGORIES, BLOCKED_CATEGORIES } from "@/domain/allowedWork";
import { TRYOUT_STATUSES } from "@/domain/tryout";
import type { TryoutRecord } from "@/domain/tryoutDecisions";
import { adminDb } from "../firebaseAdmin";
import type { TryoutRepository } from "./tryoutRepository";

// Stored tryouts are parsed on the way in, so a malformed record fails loudly instead of being trusted.
const instant = z.instanceof(Timestamp).transform((value) => value.toDate());
const TryoutRecordSchema = z.object({
  ownerId: z.string(),
  businessName: z.string(),
  area: z.string(),
  shopfrontPhoto: z.string(),
  location: z.object({ geohash: z.string(), lat: z.number(), lng: z.number() }),
  title: z.string(),
  tasks: z.array(z.string()),
  category: z.enum([...ALLOWED_CATEGORIES, ...BLOCKED_CATEGORIES]).nullable(),
  startAt: instant,
  endAt: instant,
  hours: z.number(),
  rateCentsPerHour: z.number().int(),
  payCents: z.number().int(),
  status: z.enum(TRYOUT_STATUSES),
});

const parseTryout = (data: unknown): TryoutRecord => TryoutRecordSchema.parse(data);

export const firestoreTryoutRepository: TryoutRepository = {
  async create(tryout, audit) {
    const db = adminDb();
    const ref = db.collection("tryouts").doc();
    await db.runTransaction(async (tx) => {
      const at = FieldValue.serverTimestamp();
      // Dates become Firestore timestamps; the coarse location is all a tryout holds about where it is.
      tx.create(ref, { ...tryout, createdAt: at, updatedAt: at });
      // The audit entry holds no personal data: who, what, which tryout and when.
      tx.create(db.collection("auditLog").doc(), { uid: tryout.ownerId, action: audit, target: ref.id, at });
    });
    return ref.id;
  },

  transact(id, uid, plan) {
    const db = adminDb();
    const ref = db.collection("tryouts").doc(id);
    return db.runTransaction(async (tx) => {
      const snapshot = await tx.get(ref);
      const { write, result } = plan(snapshot.exists ? parseTryout(snapshot.data()) : null);
      if (!write) return result;
      const at = FieldValue.serverTimestamp();
      tx.update(ref, { status: write.status, updatedAt: at });
      tx.create(db.collection("auditLog").doc(), { uid, action: write.audit, target: id, at });
      return result;
    });
  },
};
