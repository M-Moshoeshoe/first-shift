import { describe, expect, it } from "vitest";
import { RULES } from "@/config/rules";
import type { CreditEntry } from "@/domain/credits";
import { multiplyCents } from "@/domain/money";
import { settle, settlementCredit, type SettleEvent } from "@/domain/settlement";

// R35 an hour for an 8-hour tryout: R280 for the full day; R140 is the 4-hour minimum.
const terms = { rateCentsPerHour: 3500, agreedHours: 8 };
const FULL = multiplyCents(3500, 8);
const FOUR_HOURS = multiplyCents(3500, RULES.minPaidHours);
const fixed = (amountCents: number, needsReview = false) => ({ amountCents, minimumCents: amountCents, needsReview });

describe("settle: every row of docs/MONEY.md", () => {
  it("completed: full pay, credit used", () => {
    expect(settle({ kind: "completed", ...terms })).toEqual({ wage: fixed(FULL), credit: "use", strike: null });
  });

  it("finished early: full pay, credit used", () => {
    expect(settle({ kind: "finished_early", ...terms })).toEqual({ wage: fixed(FULL), credit: "use", strike: null });
  });

  it("young person leaves early by choice: full pay pre-filled, lowerable only to the hours worked, at least 4, credit used", () => {
    // 5 hours 10 minutes worked rounds up to 5.25 hours.
    expect(settle({ kind: "worker_left_early", ...terms, minutesWorked: 310 })).toEqual({ wage: { amountCents: FULL, minimumCents: multiplyCents(3500, 5.25), needsReview: false }, credit: "use", strike: null });
    // An hour worked still means four hours' pay.
    expect(settle({ kind: "worker_left_early", ...terms, minutesWorked: 60 }).wage?.minimumCents).toBe(FOUR_HOURS);
  });

  it("business ends it early, not for safety: full pay, credit used", () => {
    expect(settle({ kind: "business_ended_early", ...terms })).toEqual({ wage: fixed(FULL), credit: "use", strike: null });
  });

  it("ended for safety: hours worked, at least 4, to review, credit used", () => {
    expect(settle({ kind: "safety", ...terms, minutesWorked: 360 })).toEqual({ wage: fixed(multiplyCents(3500, 6), true), credit: "use", strike: null });
    expect(settle({ kind: "safety", ...terms, minutesWorked: 30 }).wage).toEqual(fixed(FOUR_HOURS, true));
  });

  it("business late cancellation: 4 hours' pay, credit used, strike for the business", () => {
    expect(settle({ kind: "business_late_cancel", ...terms })).toEqual({ wage: fixed(FOUR_HOURS), credit: "use", strike: { party: "business", reason: "late_cancellation" } });
  });

  it("business no-show: 4 hours' pay, to review, credit used, strike for the business", () => {
    expect(settle({ kind: "business_no_show", ...terms })).toEqual({ wage: fixed(FOUR_HOURS, true), credit: "use", strike: { party: "business", reason: "no_show" } });
  });

  it.each(["young_person", "business"] as const)("free cancellation by the %s: nothing owed, credit returned, no strike", (by) => {
    expect(settle({ kind: "free_cancel", by })).toEqual({ wage: null, credit: "release", strike: null });
  });

  it("young person late cancellation: nothing owed, credit returned, strike for the young person", () => {
    expect(settle({ kind: "worker_late_cancel" })).toEqual({ wage: null, credit: "release", strike: { party: "young_person", reason: "late_cancellation" } });
  });

  it("young person no-show: nothing owed, credit returned, strike for the young person", () => {
    expect(settle({ kind: "worker_no_show" })).toEqual({ wage: null, credit: "release", strike: { party: "young_person", reason: "no_show" } });
  });
});

describe("the one rule", () => {
  const every: SettleEvent[] = [
    { kind: "completed", ...terms },
    { kind: "finished_early", ...terms },
    { kind: "worker_left_early", ...terms, minutesWorked: 200 },
    { kind: "business_ended_early", ...terms },
    { kind: "safety", ...terms, minutesWorked: 90 },
    { kind: "business_late_cancel", ...terms },
    { kind: "business_no_show", ...terms },
    { kind: "free_cancel", by: "young_person" },
    { kind: "free_cancel", by: "business" },
    { kind: "worker_late_cancel" },
    { kind: "worker_no_show" },
  ];

  it.each(every.map((event) => [event.kind, event] as const))("%s: the credit is used exactly when money is owed", (_kind, event) => {
    const { wage, credit } = settle(event);
    expect(credit === "use").toBe(wage !== null && wage.amountCents > 0);
  });

  it("strikes only the side that cancelled late or didn't show", () => {
    const struck = every.filter((event) => settle(event).strike !== null).map((event) => event.kind);
    expect(struck).toEqual(["business_late_cancel", "business_no_show", "worker_late_cancel", "worker_no_show"]);
  });
});

describe("settlementCredit", () => {
  const held: CreditEntry[] = [{ kind: "grant", amount: 3, reason: "welcome" }, { kind: "hold", tryoutId: "t1" }];

  it("uses the held credit when money is owed, and returns it when nothing is", () => {
    expect(settlementCredit(settle({ kind: "completed", ...terms }), held, "t1")).toEqual({ kind: "append", entries: [{ kind: "use", tryoutId: "t1" }] });
    expect(settlementCredit(settle({ kind: "worker_no_show" }), held, "t1")).toEqual({ kind: "append", entries: [{ kind: "release", tryoutId: "t1" }] });
  });
});
