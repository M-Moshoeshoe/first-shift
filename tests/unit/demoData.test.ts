import { describe, expect, it } from "vitest";
import { DEMO_EXTRA_OWNERS, demoState } from "@/data/demo";
import { canPost } from "@/domain/credits";
import { isProfileComplete } from "@/domain/profile";
import { fromSast, sastSlot } from "@/domain/time";

const uids = { business: "demo-sipho-uid", youngPerson: "demo-thabo-uid" };

describe("the demo world npm run demo:reset restores", () => {
  // Early morning, midday and late evening: the tryouts must pass every rule whenever the reset runs.
  it.each([fromSast(2026, 10, 26, 0, 5), fromSast(2026, 10, 26, 12, 0), fromSast(2026, 10, 26, 23, 55)])("is valid and fully marked demo at %s", (now) => {
    const state = demoState(uids, now);
    const records = [...Object.values(state.users), ...Object.values(state.businesses), ...state.tryouts];
    expect(records.every((record) => record.demo === true)).toBe(true);

    expect(isProfileComplete(state.users[uids.youngPerson] ?? null, null)).toBe(true);
    expect(isProfileComplete(state.users[uids.business] ?? null, state.businesses[uids.business] ?? null)).toBe(true);
    expect(canPost(state.ledger)).toBe(true);

    expect(state.tryouts).toHaveLength(4);
    for (const tryout of state.tryouts) {
      expect(tryout.status).toBe("published");
      expect(tryout.startAt.getTime()).toBeGreaterThan(now.getTime());
      const { day, hours } = sastSlot(tryout.startAt, tryout.endAt);
      expect(day).not.toBe("");
      expect(hours).toMatch(/to/);
    }
  });

  it("puts the demo business's tryouts and the two extra businesses' in one feed", () => {
    const owners = new Set(demoState(uids, new Date("2026-10-26T06:00:00Z")).tryouts.map((tryout) => tryout.ownerId));
    expect(owners).toEqual(new Set([uids.business, ...DEMO_EXTRA_OWNERS]));
  });

  it("gives the young person no reachable phone number and no ID", () => {
    const thabo = demoState(uids, new Date()).users[uids.youngPerson];
    expect(thabo?.payoutPhone).toBe("27000000000");
    expect(thabo?.idLastFour).toBe("0000");
  });
});
