import "server-only";
import { FieldValue, type Firestore, type Transaction } from "firebase-admin/firestore";
import { z } from "zod";
import type { CreditEntry } from "@/domain/credits";

/**
 * The credit ledger in Firestore: creditLedger/{businessId}_{seq}. Entries are
 * only ever created, never updated or deleted, and each is numbered. A create
 * of a number that already exists fails the transaction, so two writers can
 * never take the same place or reorder the ledger. No client can read or write
 * it (firestore.rules); the server writes it in the same transaction as the
 * event that causes each entry, with an audit entry for each.
 */
const EntrySchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("grant"), amount: z.number().int().positive(), reason: z.enum(["welcome", "top_up"]) }),
  z.object({ kind: z.literal("hold"), tryoutId: z.string() }),
  z.object({ kind: z.literal("use"), tryoutId: z.string() }),
  z.object({ kind: z.literal("release"), tryoutId: z.string() }),
]);
const StoredSchema = z.object({ seq: z.number().int().positive() });

const ledger = (db: Firestore) => db.collection("creditLedger");
const entryId = (businessId: string, seq: number) => `${businessId}_${String(seq).padStart(6, "0")}`;

/** The business's whole ledger, in order. Read inside the transaction that may append to it. */
export async function readLedger(db: Firestore, tx: Transaction, businessId: string): Promise<CreditEntry[]> {
  // Equality only, sorted here: no composite index needed.
  const snapshot = await tx.get(ledger(db).where("businessId", "==", businessId));
  return snapshot.docs
    .map((doc) => ({ seq: StoredSchema.parse(doc.data()).seq, entry: EntrySchema.parse(doc.data()) }))
    .sort((a, b) => a.seq - b.seq)
    .map(({ entry }) => entry);
}

/** Appends entries after the ones already read, each with its own audit entry (no personal data). */
export function appendLedger(db: Firestore, tx: Transaction, businessId: string, existing: number, entries: readonly CreditEntry[], actor: string): void {
  const at = FieldValue.serverTimestamp();
  entries.forEach((entry, index) => {
    const seq = existing + index + 1;
    const id = entryId(businessId, seq);
    tx.create(ledger(db).doc(id), { ...entry, businessId, seq, at });
    tx.create(db.collection("auditLog").doc(), { uid: actor, action: `credit_${entry.kind}`, target: id, at });
  });
}
