import "server-only";
import { log } from "./log";

/** Each check really uses a service; a true means it answered, not just that a variable is set. */
export type LiveCheck = "auth" | "firestore" | "storage";
export type LiveChecks = Record<LiveCheck, boolean>;

const TIMEOUT_MS = 8_000;

const withTimeout = <T>(work: Promise<T>): Promise<T> =>
  Promise.race([work, new Promise<never>((_, reject) => setTimeout(() => reject(new Error("timeout")), TIMEOUT_MS))]);

/**
 * Runs every check side by side. A failure is logged with its reason (never a
 * value) and reported as false, so /api/health can never say "ok" while a
 * service the app depends on is broken.
 */
export async function runLiveChecks(checks: Record<LiveCheck, () => Promise<unknown>>): Promise<LiveChecks> {
  const names = Object.keys(checks) as LiveCheck[];
  const results = await Promise.allSettled(names.map((name) => withTimeout(checks[name]())));
  const outcome = {} as LiveChecks;
  results.forEach((result, index) => {
    const name = names[index];
    if (!name) return;
    outcome[name] = result.status === "fulfilled";
    if (result.status === "rejected") {
      const reason = result.reason instanceof Error ? result.reason.message.split("\n")[0]?.slice(0, 200) : "unknown";
      log("error", "live_check_failed", { check: name, reason });
    }
  });
  return outcome;
}

/**
 * The real checks, through the Admin SDK. Loaded inside each check, so a
 * module that can't load (as firebase-admin/auth once couldn't on Netlify)
 * fails that check instead of the whole route.
 */
export const adminChecks: Record<LiveCheck, () => Promise<unknown>> = {
  // Signing a custom token loads the Auth module and proves the private key parses; it needs no network.
  auth: async () => (await import("./firebaseAdmin")).adminAuth().createCustomToken("health-check"),
  // One document read proves the credentials and the network to Firestore. The document needn't exist.
  firestore: async () => (await import("./firebaseAdmin")).adminDb().doc("health/check").get(),
  storage: async () => {
    const [exists] = await (await import("./firebaseAdmin")).adminBucket().exists();
    if (!exists) throw new Error("bucket_not_found");
  },
};
