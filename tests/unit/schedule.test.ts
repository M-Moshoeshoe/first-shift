import { describe, expect, it } from "vitest";
import { isBookingOpen, overlaps, validateTryoutWindow } from "@/domain/schedule";

// SAST is UTC+2. 07:00Z is 09:00 in Johannesburg.
const sast = (iso: string) => new Date(`${iso}+02:00`);

describe("validateTryoutWindow", () => {
  const now = sast("2026-10-24T06:00:00");

  it("accepts an 8-hour daylight tryout with enough notice", () => {
    const result = validateTryoutWindow(now, { start: sast("2026-10-24T09:00:00"), end: sast("2026-10-24T17:00:00") });
    expect(result).toEqual({ ok: true, value: { hours: 8 } });
  });

  it("rejects a tryout starting in under two hours", () => {
    const result = validateTryoutWindow(now, { start: sast("2026-10-24T07:30:00"), end: sast("2026-10-24T11:30:00") });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toContain("too_soon");
  });

  it("rejects anything outside 07:00 to 18:00", () => {
    const result = validateTryoutWindow(now, { start: sast("2026-10-24T14:30:00"), end: sast("2026-10-24T18:30:00") });
    expect(!result.ok && result.error).toContain("outside_daylight");
  });

  it("allows a tryout that ends exactly at 18:00", () => {
    expect(validateTryoutWindow(now, { start: sast("2026-10-24T10:00:00"), end: sast("2026-10-24T18:00:00") }).ok).toBe(true);
  });

  it("rejects tryouts shorter than four hours or longer than eight", () => {
    const short = validateTryoutWindow(now, { start: sast("2026-10-24T09:00:00"), end: sast("2026-10-24T12:00:00") });
    const long = validateTryoutWindow(now, { start: sast("2026-10-24T08:00:00"), end: sast("2026-10-24T17:30:00") });
    expect(!short.ok && short.error).toContain("too_short");
    expect(!long.ok && long.error).toContain("too_long");
  });

  it("rejects an end before the start", () => {
    const result = validateTryoutWindow(now, { start: sast("2026-10-24T12:00:00"), end: sast("2026-10-24T09:00:00") });
    expect(result).toEqual({ ok: false, error: ["ends_before_start"] });
  });
});

describe("isBookingOpen", () => {
  const start = sast("2026-10-24T12:00:00");
  it("is open until one hour before the start", () => {
    expect(isBookingOpen(sast("2026-10-24T11:00:00"), start)).toBe(true);
    expect(isBookingOpen(sast("2026-10-24T11:01:00"), start)).toBe(false);
  });
});

describe("overlaps", () => {
  it("detects double bookings and allows back-to-back tryouts", () => {
    const morning = { start: sast("2026-10-24T08:00:00"), end: sast("2026-10-24T12:00:00") };
    const midday = { start: sast("2026-10-24T11:00:00"), end: sast("2026-10-24T15:00:00") };
    const afternoon = { start: sast("2026-10-24T12:00:00"), end: sast("2026-10-24T16:00:00") };
    expect(overlaps(morning, midday)).toBe(true);
    expect(overlaps(morning, afternoon)).toBe(false);
  });
});
