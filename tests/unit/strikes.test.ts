import { describe, expect, it } from "vitest";
import { accountStatus, activeStrikes, canTakePart, type Strike } from "@/domain/strikes";
import { addDays } from "@/domain/time";

const now = new Date("2026-10-24T08:00:00Z");
const strike = (daysAgo: number, overturned = false): Strike => ({ at: addDays(now, -daysAgo), reason: "no_show", overturned });

describe("accountStatus", () => {
  it("stays active with fewer than three recent strikes", () => {
    expect(accountStatus({ now, strikes: [strike(5), strike(10)] }).status).toBe("active");
  });

  it("suspends at three strikes within 90 days", () => {
    const result = accountStatus({ now, strikes: [strike(1), strike(30), strike(89)] });
    expect(result.status).toBe("suspended");
    expect(canTakePart(result.status)).toBe(false);
  });

  it("lets strikes expire after 90 days and ignores overturned ones", () => {
    expect(activeStrikes([strike(91), strike(2, true), strike(3)], now)).toHaveLength(1);
  });

  it("pauses a business with an unpaid tryout or an open safety report", () => {
    expect(accountStatus({ now, strikes: [], hasUnresolvedUnpaid: true }).status).toBe("paused");
    expect(accountStatus({ now, strikes: [], hasOpenSafetyReport: true }).reasons).toContain("A safety report is being reviewed");
  });
});
