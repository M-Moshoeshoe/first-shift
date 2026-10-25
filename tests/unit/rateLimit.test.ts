import { describe, expect, it, vi } from "vitest";
import { sastDateKey } from "@/domain/time";
import { consumeDailyQuota } from "@/server/rateLimit";

// An in-memory stand-in for Firestore: one map of counters, transactions run straight through.
const store = vi.hoisted(() => new Map<string, Record<string, unknown>>());
vi.mock("@/server/firebaseAdmin", () => {
  const doc = (id: string) => ({ id });
  const db = {
    collection: () => ({ doc }),
    runTransaction: async <T>(work: (transaction: unknown) => Promise<T>) =>
      work({
        get: async (ref: { id: string }) => ({ exists: store.has(ref.id), get: (field: string) => store.get(ref.id)?.[field] }),
        set: (ref: { id: string }, data: Record<string, unknown>) => store.set(ref.id, { ...store.get(ref.id), ...data }),
      }),
  };
  return { adminDb: () => db };
});

// SAST is UTC+2.
const sast = (iso: string) => new Date(`${iso}+02:00`);

describe("sastDateKey", () => {
  it("names the South African calendar day, not the UTC one", () => {
    expect(sastDateKey(sast("2026-10-25T23:30:00"))).toBe("2026-10-25");
    expect(sastDateKey(sast("2026-10-26T00:30:00"))).toBe("2026-10-26");
    // 00:30 SAST is still 22:30 the day before in UTC.
    expect(sast("2026-10-26T00:30:00").toISOString().slice(0, 10)).toBe("2026-10-25");
  });
});

describe("consumeDailyQuota", () => {
  it("counts 23:30 and 00:30 SAST on different days, so a new day starts at midnight SAST", async () => {
    store.clear();
    await consumeDailyQuota("lerato", "posts", 1, { now: sast("2026-10-25T23:30:00") });
    await expect(consumeDailyQuota("lerato", "posts", 1, { now: sast("2026-10-26T00:30:00") })).resolves.toBeUndefined();
  });

  it("refuses the request past the limit on the same SAST day", async () => {
    store.clear();
    await consumeDailyQuota("lerato", "posts", 1, { now: sast("2026-10-26T00:30:00") });
    await expect(consumeDailyQuota("lerato", "posts", 1, { now: sast("2026-10-26T23:30:00"), message: "Post this one tomorrow." })).rejects.toMatchObject({ status: 429, code: "daily_limit", publicMessage: "Post this one tomorrow." });
  });
});
