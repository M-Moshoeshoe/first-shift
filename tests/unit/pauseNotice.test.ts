import { describe, expect, it } from "vitest";
import { pauseNotice } from "@/domain/profile";
import { unpaidPause } from "@/domain/day";

describe("why a business is paused, for its dashboard", () => {
  it("says nothing while it's active", () => {
    expect(pauseNotice({ status: "active", pausedFor: null })).toBeNull();
  });

  it("names the unpaid tryout's booking, so the notice can link to it", () => {
    expect(pauseNotice({ status: "paused", pausedFor: unpaidPause("booking-1") })).toEqual({ reason: "unpaid", bookingId: "booking-1" });
  });

  it("calls a pause for a report's case a report, and never sends the case id", () => {
    expect(pauseNotice({ status: "paused", pausedFor: "case-123" })).toEqual({ reason: "report", bookingId: null });
  });

  it("falls back to other for a pause with no reason on record, such as one set by an admin", () => {
    expect(pauseNotice({ status: "paused", pausedFor: null })).toEqual({ reason: "other", bookingId: null });
    expect(pauseNotice({ status: "suspended" })).toEqual({ reason: "other", bookingId: null });
  });
});
