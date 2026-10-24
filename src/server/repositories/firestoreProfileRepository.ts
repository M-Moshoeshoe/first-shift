import "server-only";
import { FieldValue } from "firebase-admin/firestore";
import { z } from "zod";
import { AVAILABILITY, type BusinessRecord, type UserRecord } from "@/domain/profile";
import { ROLES } from "@/domain/roles";
import { adminDb } from "../firebaseAdmin";
import type { ProfileRepository } from "./profileRepository";

// Stored documents are parsed on the way in, so a malformed record fails loudly instead of being trusted.
const counter = z.number().int().min(0);
const PhotoSchema = z.object({ path: z.string(), version: z.string() });

const UserRecordSchema = z.object({
  role: z.enum(ROLES),
  status: z.literal("active"),
  completed: counter.optional(),
  onTime: counter.optional(),
  lateCancellations: counter.optional(),
  noShows: counter.optional(),
  firstName: z.string().optional(),
  area: z.string().optional(),
  availability: z.array(z.enum(AVAILABILITY)).optional(),
  payoutPhone: z.string().optional(),
  idLastFour: z.string().optional(),
  residency: z.enum(["citizen", "permanent_resident"]).optional(),
  profilePhoto: PhotoSchema.optional(),
});

const BusinessRecordSchema = z.object({
  ownerId: z.string(),
  status: z.literal("active"),
  completed: counter,
  onTime: counter,
  lateCancellations: counter,
  noShows: counter,
  name: z.string().optional(),
  area: z.string().optional(),
  openingHours: z.string().optional(),
  location: z.object({ latitude: z.number(), longitude: z.number() }).optional(),
  shopfrontPhoto: PhotoSchema.optional(),
});

const parseUser = (data: unknown): UserRecord => UserRecordSchema.parse(data);
const parseBusiness = (data: unknown): BusinessRecord => BusinessRecordSchema.parse(data);

/** Firestore rejects undefined values; optional fields that aren't set are simply left out. */
const defined = (record: object): Record<string, unknown> => Object.fromEntries(Object.entries(record).filter(([, value]) => value !== undefined));

export const firestoreProfileRepository: ProfileRepository = {
  transact(uid, claimHash, plan) {
    const db = adminDb();
    const userRef = db.collection("users").doc(uid);
    const businessRef = db.collection("businesses").doc(uid);
    const idHashes = db.collection("idHashes");

    return db.runTransaction(async (tx) => {
      const [user, business, held, claim] = await Promise.all([
        tx.get(userRef),
        tx.get(businessRef),
        tx.get(idHashes.where("uid", "==", uid).limit(1)),
        claimHash ? tx.get(idHashes.doc(claimHash)) : Promise.resolve(null),
      ]);

      const { write, result } = plan({
        user: user.exists ? parseUser(user.data()) : null,
        business: business.exists ? parseBusiness(business.data()) : null,
        heldIdHash: held.docs[0]?.id ?? null,
        claimOwner: claim?.exists ? String(claim.get("uid")) : null,
      });
      if (!write) return result;

      const at = FieldValue.serverTimestamp();
      if (write.user) tx.set(userRef, { ...defined(write.user), updatedAt: at }, { merge: true });
      if (write.business) tx.set(businessRef, { ...defined(write.business), updatedAt: at }, { merge: true });
      if (write.claimIdHash) tx.create(idHashes.doc(write.claimIdHash), { uid, claimedAt: at });
      // The audit entry holds no personal data: who, what and when.
      tx.create(db.collection("auditLog").doc(), { uid, action: write.audit, at });
      return result;
    });
  },
};
