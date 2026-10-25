import "server-only";
import { consumeDailyQuota } from "../rateLimit";
import { firestoreFindingRepository } from "../repositories/firestoreFindingRepository";
import { firestoreProfileRepository } from "../repositories/firestoreProfileRepository";
import { createFindingService, type FindingService } from "./findingService";

/** The finding service wired to Firestore and the daily limits. Routes use this; tests use fakes. */
export function liveFindingService(): FindingService {
  return createFindingService({ finding: firestoreFindingRepository, profiles: firestoreProfileRepository, consumeQuota: consumeDailyQuota, now: () => new Date() });
}
