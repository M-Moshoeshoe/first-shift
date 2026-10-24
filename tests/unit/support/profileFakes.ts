import { createHmac } from "node:crypto";
import type { BusinessRecord, UserRecord } from "@/domain/profile";
import type { PhotoMeta } from "@/domain/profileDecisions";
import type { PhotoStore } from "@/server/repositories/photoStore";
import type { AuditAction, ProfileRepository } from "@/server/repositories/profileRepository";
import { createProfileService } from "@/server/services/profileService";

// Real-looking South African ID numbers that pass every structural check (see saId.test.ts).
export const ADULT_ID = "0001155800087"; // born 2000-01-15, citizen
export const OTHER_ADULT_ID = "9507304123180"; // born 1995-07-30, permanent resident
export const BAD_IDS = {
  format: "12345",
  date_of_birth: "9913325800087",
  citizenship_digit: "9906065011289",
  check_digit: "0001155800088",
  under_age: "1003035011082",
} as const;

export const NOW = new Date("2026-10-24T08:00:00Z");
export const testHash = (digits: string): string => createHmac("sha256", "test-secret-for-unit-tests-only-32").update(digits).digest("hex");

export const workerInput = (overrides: Partial<{ firstName: string; area: string; idNumber: string }> = {}) => ({
  firstName: "Thabo",
  area: "Ivory Park",
  availability: ["saturdays" as const],
  payoutPhone: "27821234567",
  idNumber: ADULT_ID,
  ...overrides,
});

/** An in-memory stand-in for Firestore and Storage with the same all-or-nothing transaction contract. */
export function createFakeStore() {
  const users = new Map<string, UserRecord>();
  const businesses = new Map<string, BusinessRecord>();
  const idHashes = new Map<string, string>();
  const audit: { uid: string; action: AuditAction }[] = [];
  const photos = new Map<string, PhotoMeta>();

  const repo: ProfileRepository = {
    async transact(uid, claimHash, plan) {
      const heldIdHash = [...idHashes].find(([, owner]) => owner === uid)?.[0] ?? null;
      const state = structuredClone({
        user: users.get(uid) ?? null,
        business: businesses.get(uid) ?? null,
        heldIdHash,
        claimOwner: claimHash ? (idHashes.get(claimHash) ?? null) : null,
      });
      // If plan throws, nothing below runs: the same guarantee a Firestore transaction gives.
      const { write, result } = plan(state);
      if (write) {
        if (write.claimIdHash && idHashes.has(write.claimIdHash)) throw new Error("claim already exists");
        if (write.user) users.set(uid, structuredClone(write.user));
        if (write.business) businesses.set(uid, structuredClone(write.business));
        if (write.claimIdHash) idHashes.set(write.claimIdHash, uid);
        audit.push({ uid, action: write.audit });
      }
      return result;
    },
  };

  const photoStore: PhotoStore = { metadata: async (path) => photos.get(path) ?? null };
  const snapshot = () => JSON.stringify({ users: [...users], businesses: [...businesses], idHashes: [...idHashes], audit });
  return { users, businesses, idHashes, audit, photos, repo, photoStore, snapshot };
}

export type FakeStore = ReturnType<typeof createFakeStore>;

export function fakeService(store: FakeStore, hashId: (digits: string) => string = testHash) {
  return createProfileService({ repo: store.repo, photos: store.photoStore, hashId, now: () => NOW });
}
