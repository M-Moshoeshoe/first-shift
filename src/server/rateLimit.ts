import "server-only";
import { sastDateKey } from "@/domain/time";
import { AppError } from "./errors";
import { adminDb } from "./firebaseAdmin";

const DEFAULT_MESSAGE = "You've reached today's limit for this. Try again tomorrow.";

interface QuotaOptions {
  /** What the person sees when the limit is reached: say which limit and when it resets. */
  message?: string;
  now?: Date;
}

/**
 * Counts an action against a per-user daily limit inside a transaction, so two
 * quick requests can't both slip past the limit. A day is a South African
 * calendar day: the count starts again at midnight SAST, not midnight UTC.
 */
export async function consumeDailyQuota(uid: string, bucket: string, limit: number, { message = DEFAULT_MESSAGE, now = new Date() }: QuotaOptions = {}): Promise<void> {
  const day = sastDateKey(now);
  const ref = adminDb().collection("rateLimits").doc(`${uid}_${bucket}_${day}`);
  const allowed = await adminDb().runTransaction(async (transaction) => {
    const snapshot = await transaction.get(ref);
    const used = snapshot.exists ? Number(snapshot.get("count") ?? 0) : 0;
    if (used >= limit) return false;
    transaction.set(ref, { uid, bucket, count: used + 1, day }, { merge: true });
    return true;
  });
  if (!allowed) throw new AppError(429, "daily_limit", message);
}
