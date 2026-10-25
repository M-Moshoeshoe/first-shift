import { describe, expect, it } from "vitest";
import { canWithdraw, orderTryouts, STATUS_LINE, statusLine } from "@/app/(account)/business/_components/ownTryouts";
import type { OwnTryout } from "@/lib/useOwnTryouts";
import { TRYOUT_STATUSES } from "@/domain/tryout";

const tryout = (id: string, status: OwnTryout["status"], day: number): OwnTryout => ({
  id,
  title: "Shop helper",
  area: "Tembisa",
  startAt: new Date(Date.UTC(2026, 9, day, 7)),
  endAt: new Date(Date.UTC(2026, 9, day, 13)),
  payCents: 18138,
  status,
  applicants: 0,
});

describe("the owner's tryout list", () => {
  it("has a status line for every status", () => {
    expect(TRYOUT_STATUSES.map((status) => STATUS_LINE[status])).toEqual(["Being checked", "Live", "Booked", "Done", "Withdrawn"]);
  });

  it("says how many have applied while a tryout is live", () => {
    expect(statusLine({ status: "published", applicants: 0 })).toBe("Live, 0 applied");
    expect(statusLine({ status: "published", applicants: 3 })).toBe("Live, 3 applied");
    expect(statusLine({ status: "booked", applicants: 3 })).toBe("Booked");
  });

  it("offers Withdraw only while nobody is booked", () => {
    expect(TRYOUT_STATUSES.filter(canWithdraw)).toEqual(["review", "published"]);
  });

  it("puts tryouts still on first, soonest first, then the rest, most recent first", () => {
    const ordered = orderTryouts([tryout("old", "completed", 10), tryout("later", "published", 30), tryout("soon", "review", 27), tryout("gone", "withdrawn", 20), tryout("booked", "booked", 28)]);
    expect(ordered.map((item) => item.id)).toEqual(["soon", "booked", "later", "gone", "old"]);
  });
});
