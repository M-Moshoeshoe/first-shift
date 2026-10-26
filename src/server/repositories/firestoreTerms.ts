import "server-only";
import { FieldValue } from "firebase-admin/firestore";
import { decideTermsAcceptance } from "@/domain/terms";
import { adminDb } from "../firebaseAdmin";

/**
 * termsAcceptances/{uid}: the version of the Terms and Privacy notice this
 * person last agreed to, and when, with an audit entry in the same
 * transaction. Server-only (firestore.rules denies every client).
 */
export function recordTermsAcceptance(uid: string, version: string, demo: boolean): Promise<"accepted" | "unchanged"> {
  const db = adminDb();
  const ref = db.collection("termsAcceptances").doc(uid);
  return db.runTransaction(async (tx) => {
    const snapshot = await tx.get(ref);
    const recorded = snapshot.exists ? { version: String(snapshot.get("version")) } : null;
    if (decideTermsAcceptance(recorded, version).kind === "unchanged") return "unchanged" as const;
    const at = FieldValue.serverTimestamp();
    tx.set(ref, { uid, version, demo, at });
    tx.create(db.collection("auditLog").doc(), { uid, action: "terms_accepted", target: version, at });
    return "accepted" as const;
  });
}
