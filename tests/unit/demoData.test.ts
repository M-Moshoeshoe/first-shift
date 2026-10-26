import { describe, expect, it } from "vitest";
import { DEMO_EXTRA_OWNERS, demoState } from "@/data/demo";
import { canPost, creditBalance, freeLeft } from "@/domain/credits";
import { hireOfferDue } from "@/domain/hire";
import { crossesRegularEmploymentLine } from "@/domain/regularEmployment";
import { recordEntries } from "@/domain/workRecord";
import { isProfileComplete, needsWorkerUpdate, ownerReady } from "@/domain/profile";
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
    // Everything asked since: the owner's details, and the young person's ways to be paid, skills, languages and surname.
    expect(ownerReady(state.users[uids.business] ?? null, state.businesses[uids.business] ?? null)).toBe(true);
    expect(needsWorkerUpdate(state.users[uids.youngPerson] ?? { role: "young_person", status: "active" })).toBe(false);

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

  it("gives neither demo account a reachable phone number or a real ID", () => {
    const state = demoState(uids, new Date());
    expect(state.users[uids.youngPerson]?.payoutPhone).toBe("27000000000");
    expect(state.users[uids.youngPerson]?.idLastFour).toBe("0000");
    expect(state.businesses[uids.business]?.ownerPhone).toBe("27000000001");
    expect(state.users[uids.business]?.idLastFour).toBe("0000");
  });

  it("gives Sipho and Thabo two finished, paid, Received tryouts, one with an approved reference, so the record has entries", () => {
    const now = fromSast(2026, 10, 26, 10, 0);
    const state = demoState(uids, now);
    expect(state.history).toHaveLength(2);
    for (const past of state.history) {
      expect(past.tryout.status).toBe("completed");
      expect(past.booking).toMatchObject({ status: "ended", demo: true, ownerId: uids.business, workerId: uids.youngPerson, payment: { state: "received" } });
      expect(past.booking.endAt.getTime()).toBeLessThan(now.getTime());
    }
    const references = new Map(state.history.flatMap((past) => (past.reference ? [[past.bookingId, past.reference] as const] : [])));
    expect([...references.values()].map((reference) => reference.status)).toEqual(["approved"]);
    const entries = recordEntries(state.history.map((past) => ({ id: past.bookingId, booking: past.booking })), references);
    expect(entries).toHaveLength(2);
    expect(entries.filter((entry) => entry.reference)).toHaveLength(1);
  });

  it("keeps the credits and counters in step with that history, with credits to spare for judges", () => {
    const state = demoState(uids, fromSast(2026, 10, 26, 10, 0));
    expect(creditBalance(state.ledger)).toMatchObject({ used: 2, held: 0, available: 6 });
    expect(freeLeft(state.ledger)).toBe(1);
    expect(state.businesses[uids.business]).toMatchObject({ completed: 2, payments: 2, paidOnTime: 2 });
    expect(state.users[uids.youngPerson]).toMatchObject({ completed: 2, onTime: 2 });
  });

  it("brings up the job offer on the next tryout they finish together, and that tryout stays under the 24-hour line", () => {
    const now = fromSast(2026, 10, 26, 10, 0);
    const state = demoState(uids, now);
    const slots = state.history.map((past) => ({ startAt: past.booking.startAt, hours: past.booking.hours }));
    const [next] = state.tryouts;
    if (!next) throw new Error("no live tryout");
    expect(crossesRegularEmploymentLine(slots, { startAt: next.startAt, hours: next.hours })).toBe(false);
    expect(hireOfferDue(2, slots, now, false)).toBe(false);
    expect(hireOfferDue(3, [...slots, { startAt: next.startAt, hours: next.hours }], now, false)).toBe(true);
  });

  it("labels the seeded reference honestly: the model's words as written with AI, the hand-written fallback as an example", () => {
    const now = fromSast(2026, 10, 26, 10, 0);
    const written = demoState(uids, now, "Thabo arrived on time and greeted every customer.").history.find((past) => past.reference)?.reference;
    expect(written).toMatchObject({ text: "Thabo arrived on time and greeted every customer.", status: "approved" });
    expect(written?.example).toBeUndefined();
    const fallback = demoState(uids, now, null).history.find((past) => past.reference)?.reference;
    expect(fallback).toMatchObject({ status: "approved", example: true });
  });
});

