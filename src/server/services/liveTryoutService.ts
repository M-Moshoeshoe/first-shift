import "server-only";
import { checkWork, draftTryout } from "../ai";
import { serverEnv } from "../env";
import { consumeDailyQuota } from "../rateLimit";
import { firestoreProfileRepository } from "../repositories/firestoreProfileRepository";
import { firestoreTryoutRepository } from "../repositories/firestoreTryoutRepository";
import { createTryoutService, type TryoutService } from "./tryoutService";

/** The tryout service wired to Firestore, Claude and the daily limits. Routes use this; tests use fakes. */
export function liveTryoutService(): TryoutService {
  return createTryoutService({
    tryouts: firestoreTryoutRepository,
    profiles: firestoreProfileRepository,
    draftTryout,
    checkWork,
    consumeQuota: consumeDailyQuota,
    aiDailyLimit: serverEnv().AI_DAILY_REQUESTS_PER_USER,
    now: () => new Date(),
  });
}
