import "server-only";
import { createHash } from "node:crypto";
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

/**
 * At most once in this many seconds, for everyone: claimed in a transaction,
 * so two quick taps can't both pass. For actions that affect a shared world,
 * such as resetting the demo. Kept apart from the per-user daily counts.
 */
export async function claimCooldown(key: string, seconds: number, message: string, now: Date = new Date()): Promise<void> {
  const ref = adminDb().collection("cooldowns").doc(key);
  const allowed = await adminDb().runTransaction(async (transaction) => {
    const last = (await transaction.get(ref)).get("at") as { toDate(): Date } | undefined;
    if (last && now.getTime() - last.toDate().getTime() < seconds * 1000) return false;
    transaction.set(ref, { at: now });
    return true;
  });
  if (!allowed) throw new AppError(429, "too_soon", message);
}

/**
 * At most limit actions in each window of this many minutes for one key, for
 * routes used before anyone is signed in, such as the demo sign-in. Counted
 * in a transaction like the daily limits. The key (a network address) is
 * stored only as a hash, and never logged.
 */
export async function consumeWindowQuota(key: string, limit: number, windowMinutes: number, message: string, now: Date = new Date()): Promise<void> {
  const window = Math.floor(now.getTime() / (windowMinutes * 60_000));
  const hashed = createHash("sha256").update(key).digest("hex").slice(0, 32);
  const ref = adminDb().collection("rateLimits").doc(`${hashed}_${window}`);
  const allowed = await adminDb().runTransaction(async (transaction) => {
    const snapshot = await transaction.get(ref);
    const used = snapshot.exists ? Number(snapshot.get("count") ?? 0) : 0;
    if (used >= limit) return false;
    transaction.set(ref, { count: used + 1, window }, { merge: true });
    return true;
  });
  if (!allowed) throw new AppError(429, "too_many_requests", message);
}

/** The caller's network address as Netlify reports it (its edge sets x-nf-client-connection-ip itself), for limits before sign-in. */
export function clientAddress(request: Request): string {
  return request.headers.get("x-nf-client-connection-ip") ?? request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
}
