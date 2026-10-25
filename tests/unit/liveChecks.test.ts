import { afterEach, describe, expect, it, vi } from "vitest";
import { runLiveChecks } from "@/server/liveChecks";

afterEach(() => vi.restoreAllMocks());

describe("runLiveChecks", () => {
  it("reports each service that answered as true", async () => {
    expect(await runLiveChecks({ auth: async () => "token", firestore: async () => ({}), storage: async () => undefined })).toEqual({ auth: true, firestore: true, storage: true });
  });

  it("reports a service that can't load or answer as false, and logs why without the details", async () => {
    const logged = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const broken = new Error("Failed to load external module firebase-admin/auth: Error [ERR_REQUIRE_ESM]\n  at a stack line");
    const result = await runLiveChecks({ auth: () => Promise.reject(broken), firestore: async () => ({}), storage: async () => undefined });
    expect(result).toEqual({ auth: false, firestore: true, storage: true });
    const line = String(logged.mock.calls[0]?.[0]);
    expect(line).toContain("live_check_failed");
    expect(line).toContain("ERR_REQUIRE_ESM");
    expect(line).not.toContain("stack line");
  });

  it("fails a check that never answers, rather than hanging the health route", async () => {
    vi.useFakeTimers();
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    const pending = runLiveChecks({ auth: () => new Promise(() => undefined), firestore: async () => ({}), storage: async () => undefined });
    await vi.advanceTimersByTimeAsync(8_000);
    expect(await pending).toEqual({ auth: false, firestore: true, storage: true });
    vi.useRealTimers();
  });
});
