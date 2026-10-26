import { inflateSync } from "node:zlib";
import { afterEach, describe, expect, it, vi } from "vitest";
import { DEMO_COPY } from "@/domain/demoCopy";
import { placeholderPng } from "@/server/demoPhotos";
import { AppError } from "@/server/errors";
import { createDemoResetService } from "@/server/services/demoResetService";

const NOW = new Date("2026-10-26T08:00:00Z");

function fakes(tooSoon = false) {
  const reset = vi.fn(async () => undefined);
  const claimCooldown = vi.fn(async (_key: string, _seconds: number, message: string) => {
    if (tooSoon) throw new AppError(429, "too_soon", message);
  });
  return { reset, claimCooldown, service: createDemoResetService({ reset, claimCooldown, now: () => NOW }) };
}

afterEach(() => vi.restoreAllMocks());

describe("Reset the demo", () => {
  it("resets the demo world for a demo account, after claiming the one-minute cooldown", async () => {
    vi.spyOn(console, "log").mockImplementation(() => undefined);
    const { service, reset, claimCooldown } = fakes();
    await expect(service.reset({ uid: "demo-thabo", demo: true })).resolves.toEqual({ status: "reset" });
    expect(claimCooldown).toHaveBeenCalledWith("demo_reset", 60, DEMO_COPY.resetTooSoon, NOW);
    expect(reset).toHaveBeenCalledWith(NOW);
    expect(claimCooldown.mock.invocationCallOrder[0]).toBeLessThan(reset.mock.invocationCallOrder[0] ?? 0);
  });

  it("refuses a real account, and resets nothing", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const { service, reset, claimCooldown } = fakes();
    await expect(service.reset({ uid: "real-ayanda", demo: false })).rejects.toMatchObject({ status: 403, code: "not_demo" });
    expect(claimCooldown).not.toHaveBeenCalled();
    expect(reset).not.toHaveBeenCalled();
  });

  it("refuses a second reset within the minute, and resets nothing", async () => {
    const { service, reset } = fakes(true);
    await expect(service.reset({ uid: "demo-sipho", demo: true })).rejects.toMatchObject({ status: 429, publicMessage: DEMO_COPY.resetTooSoon });
    expect(reset).not.toHaveBeenCalled();
  });
});

describe("the demo's placeholder photos", () => {
  it.each(["profile", "shopfront"] as const)("are real 240 by 240 PNG images: %s", (kind) => {
    const png = placeholderPng(kind);
    expect([...png.subarray(0, 8)]).toEqual([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    expect(png.readUInt32BE(16)).toBe(240);
    expect(png.readUInt32BE(20)).toBe(240);
    const idat = png.indexOf("IDAT");
    const pixels = inflateSync(png.subarray(idat + 4, idat + 4 + png.readUInt32BE(idat - 4)));
    expect(pixels.length).toBe(240 * (1 + 240 * 3));
    expect(png.length).toBeLessThan(2 * 1024 * 1024);
  });
});
