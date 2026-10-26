import { describe, expect, it, vi } from "vitest";
import { sastDateKey } from "@/domain/time";
import { clientAddress, consumeDailyQuota, consumeWindowQuota } from "@/server/rateLimit";

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

describe("consumeWindowQuota (the demo sign-in limit)", () => {
  const at = (iso: string) => new Date(iso);

  it("allows the limit in a window, refuses the next one, and starts again in the next window", async () => {
    store.clear();
    for (let i = 0; i < 3; i += 1) await consumeWindowQuota("demo_sign_in:203.0.113.7", 3, 10, "Wait.", at("2026-10-26T10:01:00Z"));
    await expect(consumeWindowQuota("demo_sign_in:203.0.113.7", 3, 10, "Wait.", at("2026-10-26T10:09:00Z"))).rejects.toMatchObject({ status: 429, code: "too_many_requests", publicMessage: "Wait." });
    await expect(consumeWindowQuota("demo_sign_in:203.0.113.7", 3, 10, "Wait.", at("2026-10-26T10:10:00Z"))).resolves.toBeUndefined();
  });

  it("counts each address apart, and never stores the address itself", async () => {
    store.clear();
    await consumeWindowQuota("demo_sign_in:203.0.113.7", 1, 10, "Wait.", at("2026-10-26T10:01:00Z"));
    await expect(consumeWindowQuota("demo_sign_in:198.51.100.2", 1, 10, "Wait.", at("2026-10-26T10:01:00Z"))).resolves.toBeUndefined();
    expect(JSON.stringify([...store.entries()])).not.toContain("203.0.113.7");
  });
});

describe("clientAddress", () => {
  it("prefers the address Netlify's edge sets, then the first forwarded one", () => {
    const request = (headers: Record<string, string>) => new Request("https://example.test", { headers });
    expect(clientAddress(request({ "x-nf-client-connection-ip": "203.0.113.7", "x-forwarded-for": "198.51.100.2" }))).toBe("203.0.113.7");
    expect(clientAddress(request({ "x-forwarded-for": "198.51.100.2, 10.0.0.1" }))).toBe("198.51.100.2");
    expect(clientAddress(request({}))).toBe("unknown");
  });
});
