import { vi } from "vitest";
import { decideWork } from "@/domain/allowedWork";
import type { BusinessRecord, UserRecord } from "@/domain/profile";
import type { TryoutRecord, TryoutTerms } from "@/domain/tryoutDecisions";
import { AppError } from "@/server/errors";
import type { TryoutAuditAction, TryoutRepository } from "@/server/repositories/tryoutRepository";
import { createTryoutService } from "@/server/services/tryoutService";
import { createFakeStore } from "./profileFakes";

// Monday 26 October 2026, 08:00 in Johannesburg (SAST is UTC+2).
export const NOW = new Date("2026-10-26T06:00:00Z");

/** Lerato's shop, pinned exactly; a tryout must only ever carry the cell around it. */
export const PIN = { latitude: -25.996341, longitude: 28.227113, accuracyMetres: 20 };

export const owner: UserRecord = { role: "business", status: "active" };
export const shop: BusinessRecord = {
  ownerId: "lerato",
  status: "active",
  completed: 0,
  onTime: 0,
  lateCancellations: 0,
  noShows: 0,
  name: "Lerato's Spaza",
  area: "Tembisa",
  openingHours: "Monday to Saturday, 8:00 to 17:00",
  location: PIN,
  shopfrontPhoto: { path: "photos/lerato/shopfront.jpg", version: "1" },
};

/** Tomorrow, 09:00 to 15:00, at the minimum wage: passes every rule. */
export const terms = (overrides: Partial<TryoutTerms> = {}): TryoutTerms => ({
  description: "Help sorting stock and serving customers on Saturday",
  title: "Shop helper",
  tasks: ["Pack bread onto the front shelves", "Greet customers at the door"],
  date: "2026-10-27",
  startTime: "09:00",
  hours: 6,
  rateCentsPerHour: 3023,
  ...overrides,
});

/** Classifies by keyword, through the real domain rule, so blocked and review are decided as in production. */
export const fakeCheckWork = vi.fn(async (text: string) => {
  if (/rewire|wiring|db board/i.test(text)) return decideWork("electrical", 0.95);
  if (/not sure|something/i.test(text)) return decideWork("customer_service", 0.4);
  return decideWork("stock_and_packing", 0.9);
});

export const fakeDraft = vi.fn(async () => ({ title: "Shop helper", tasks: ["Pack bread onto the front shelves"], hours: 10 }));

export function createTryoutFakes() {
  const store = createFakeStore();
  store.users.set("lerato", owner);
  store.businesses.set("lerato", shop);
  const tryouts = new Map<string, TryoutRecord>();
  const audit: { uid: string; action: TryoutAuditAction; target: string }[] = [];
  const quota = new Map<string, number>();
  let next = 0;

  const repo: TryoutRepository = {
    async create(tryout, action) {
      next += 1;
      const id = `tryout-${next}`;
      tryouts.set(id, structuredClone(tryout));
      audit.push({ uid: tryout.ownerId, action, target: id });
      return id;
    },
    async transact(id, uid, plan) {
      // If plan throws, nothing below runs: the same guarantee a Firestore transaction gives.
      const current = tryouts.get(id);
      const { write, result } = plan(current ? structuredClone(current) : null);
      if (write && current) {
        tryouts.set(id, { ...current, status: write.status });
        audit.push({ uid, action: write.audit, target: id });
      }
      return result;
    },
  };

  const consumeQuota = async (uid: string, bucket: string, limit: number, { message }: { message: string }) => {
    const key = `${uid}_${bucket}`;
    const used = quota.get(key) ?? 0;
    if (used >= limit) throw new AppError(429, "daily_limit", message);
    quota.set(key, used + 1);
  };

  const service = createTryoutService({
    tryouts: repo,
    profiles: store.repo,
    draftTryout: fakeDraft,
    checkWork: fakeCheckWork,
    consumeQuota,
    aiDailyLimit: 30,
    now: () => NOW,
  });
  return { store, tryouts, audit, quota, service };
}
