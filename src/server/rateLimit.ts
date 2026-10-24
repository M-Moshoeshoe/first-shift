import "server-only";
import { AppError } from "./errors";
import { adminDb } from "./firebaseAdmin";

const today = (): string => new Date().toISOString().slice(0, 10);

/**
 * Counts an action against a per-user daily limit inside a transaction, so two
 * quick requests can't both slip past the limit.
 */
export async function consumeDailyQuota(uid: string, bucket: string, limit: number): Promise<void> {
  const ref = adminDb().collection("rateLimits").doc(`${uid}_${bucket}_${today()}`);
  const allowed = await adminDb().runTransaction(async (transaction) => {
    const snapshot = await transaction.get(ref);
    const used = snapshot.exists ? Number(snapshot.get("count") ?? 0) : 0;
    if (used >= limit) return false;
    transaction.set(ref, { uid, bucket, count: used + 1, day: today() }, { merge: true });
    return true;
  });
  if (!allowed) throw new AppError(429, "daily_limit", "You've reached today's limit for this. Try again tomorrow.");
}
