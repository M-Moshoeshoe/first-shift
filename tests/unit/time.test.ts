import { describe, expect, it } from "vitest";
import { atSastTime, fromSast, sameSastDay, sastDateKey, sastParts, sastSlot } from "@/domain/time";

// SAST is UTC+2 all year: no daylight saving.
describe("South African wall-clock time", () => {
  it("converts both ways across midnight UTC", () => {
    expect(fromSast(2026, 10, 25, 1, 30)).toEqual(new Date("2026-10-24T23:30:00Z"));
    expect(sastParts(new Date("2026-10-24T23:30:00Z"))).toEqual({ year: 2026, month: 10, day: 25, hour: 1, minute: 30 });
    expect(atSastTime(new Date("2026-10-24T23:30:00Z"), 23, 59)).toEqual(new Date("2026-10-25T21:59:00Z"));
  });

  it("keys a day by the South African date, so 23:30 and 00:30 SAST are different days", () => {
    expect(sastDateKey(fromSast(2026, 10, 25, 23, 30))).toBe("2026-10-25");
    expect(sastDateKey(fromSast(2026, 10, 26, 0, 30))).toBe("2026-10-26");
    expect(sastDateKey(fromSast(2027, 1, 1, 0, 0))).toBe("2027-01-01");
    expect(sameSastDay(fromSast(2026, 10, 25, 23, 30), fromSast(2026, 10, 26, 0, 30))).toBe(false);
  });

  it("formats a slip's day and hours in South African time", () => {
    expect(sastSlot(fromSast(2026, 10, 27, 9, 0), fromSast(2026, 10, 27, 15, 0))).toEqual({ day: "Tue 27 Oct", hours: "9:00 to 15:00" });
    // 07:30 SAST is 05:30 UTC; the day is still read in South Africa.
    expect(sastSlot(new Date("2026-10-31T22:30:00Z"), new Date("2026-11-01T04:30:00Z"))).toEqual({ day: "Sun 1 Nov", hours: "0:30 to 6:30" });
  });
});
