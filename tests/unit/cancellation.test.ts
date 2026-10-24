import { describe, expect, it } from "vitest";
import { cancellationConsequence, classifyCancellation, freeCancelUntil } from "@/domain/cancellation";

const sast = (iso: string) => new Date(`${iso}+02:00`);
const start = sast("2026-10-24T09:00:00");

describe("freeCancelUntil", () => {
  it("is 12 hours before the start for bookings made days ahead", () => {
    expect(freeCancelUntil(sast("2026-10-21T10:00:00"), start)).toEqual(sast("2026-10-23T21:00:00"));
  });

  it("is 15 minutes after booking for same-day bookings", () => {
    expect(freeCancelUntil(sast("2026-10-24T06:30:00"), start)).toEqual(sast("2026-10-24T06:45:00"));
  });
});

describe("classifyCancellation", () => {
  const sameDayBooking = sast("2026-10-24T06:30:00");

  it("is free inside the grace period of a same-day booking", () => {
    expect(classifyCancellation({ now: sast("2026-10-24T06:40:00"), bookedAt: sameDayBooking, start, recentGraceCancels: 0 })).toBe("free");
  });

  it("is late once the grace period has passed", () => {
    expect(classifyCancellation({ now: sast("2026-10-24T07:00:00"), bookedAt: sameDayBooking, start, recentGraceCancels: 0 })).toBe("late");
  });

  it("counts a fourth grace cancellation in 30 days as late", () => {
    expect(classifyCancellation({ now: sast("2026-10-24T06:40:00"), bookedAt: sameDayBooking, start, recentGraceCancels: 3 })).toBe("late");
  });

  it("doesn't limit cancellations made more than 12 hours ahead", () => {
    const now = sast("2026-10-22T09:00:00");
    expect(classifyCancellation({ now, bookedAt: sast("2026-10-21T09:00:00"), start, recentGraceCancels: 5 })).toBe("free");
  });

  it("treats anything after the start as after_start", () => {
    expect(classifyCancellation({ now: start, bookedAt: sameDayBooking, start, recentGraceCancels: 0 })).toBe("after_start");
  });
});

describe("cancellationConsequence", () => {
  it("gives a strike for late cancellations and makes businesses owe the minimum", () => {
    expect(cancellationConsequence("young_person", "late")).toEqual({ strike: true, businessOwesMinimum: false });
    expect(cancellationConsequence("business", "late")).toEqual({ strike: true, businessOwesMinimum: true });
    expect(cancellationConsequence("business", "free")).toEqual({ strike: false, businessOwesMinimum: false });
  });
});
