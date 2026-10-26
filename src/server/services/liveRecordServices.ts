import "server-only";
import { randomBytes } from "node:crypto";
import { writeReference } from "../ai";
import { serverEnv } from "../env";
import { consumeDailyQuota } from "../rateLimit";
import { firestoreBookingRepository } from "../repositories/firestoreBookingRepository";
import { firestoreHireRepository } from "../repositories/firestoreHireRepository";
import { firestoreReferenceRepository } from "../repositories/firestoreReferenceRepository";
import { createHireService, type HireService } from "./hireService";
import { createReferenceService, type ReferenceService } from "./referenceService";

/** References and the work record, wired to Firestore, Claude and the daily AI limit. Routes use this; tests use fakes. */
export function liveReferenceService(): ReferenceService {
  return createReferenceService({
    references: firestoreReferenceRepository,
    writeReference,
    consumeQuota: consumeDailyQuota,
    aiDailyLimit: serverEnv().AI_DAILY_REQUESTS_PER_USER,
    // 144 bits, from the operating system's secure random source: 24 base64url characters.
    newToken: () => randomBytes(18).toString("base64url"),
  });
}

export function liveHireService(): HireService {
  return createHireService({ hires: firestoreHireRepository, bookings: firestoreBookingRepository, now: () => new Date() });
}
