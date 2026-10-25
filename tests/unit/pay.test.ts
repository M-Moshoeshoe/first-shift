import { describe, expect, it } from "vitest";
import { formatRand, parseRand } from "@/domain/money";
import { agreedPayCents, billableHours, isAcceptedAmount, payOwed } from "@/domain/pay";

const rate = 3023;

describe("agreedPayCents", () => {
  it("pays R241.84 for eight hours at the minimum wage", () => {
    expect(agreedPayCents(rate, 8)).toEqual({ ok: true, value: 24184 });
    expect(formatRand(24184)).toBe("R241.84");
  });

  it("refuses pay below the minimum wage or outside four to eight hours", () => {
    expect(agreedPayCents(3000, 8)).toEqual({ ok: false, error: "below_minimum_wage" });
    expect(agreedPayCents(rate, 3)).toEqual({ ok: false, error: "too_few_hours" });
    expect(agreedPayCents(rate, 9)).toEqual({ ok: false, error: "too_many_hours" });
  });
});

describe("payOwed", () => {
  const base = { rateCentsPerHour: rate, agreedHours: 8 };

  it("pays the full amount when the work is finished early", () => {
    const owed = payOwed({ ...base, minutesWorked: 300, endReason: "finished_early" });
    expect(owed).toEqual({ amountCents: 24184, minimumCents: 24184, needsReview: false });
  });

  it("pays the full amount when the business ends it early", () => {
    expect(payOwed({ ...base, minutesWorked: 120, endReason: "business_ended_early" }).amountCents).toBe(24184);
  });

  it("lets the owner lower pay only when the worker left early, never below four hours", () => {
    const owed = payOwed({ ...base, minutesWorked: 150, endReason: "worker_left_early" });
    expect(owed.amountCents).toBe(24184);
    expect(owed.minimumCents).toBe(12092);
    expect(isAcceptedAmount(12092, owed)).toBe(true);
    expect(isAcceptedAmount(12000, owed)).toBe(false);
  });

  it("counts worked time above four hours in quarter hours", () => {
    expect(billableHours(301)).toBe(5.25);
    expect(payOwed({ ...base, minutesWorked: 301, endReason: "worker_left_early" }).minimumCents).toBe(15871);
  });

  it("sends safety endings to review with at least four hours' pay", () => {
    expect(payOwed({ ...base, minutesWorked: 60, endReason: "safety" })).toEqual({ amountCents: 12092, minimumCents: 12092, needsReview: true });
  });

  it("charges the four-hour minimum when a business cancels late", () => {
    expect(payOwed({ ...base, minutesWorked: 0, endReason: "business_late_cancel" }).amountCents).toBe(12092);
  });

  it("always allows an owner to pay more than the minimum", () => {
    expect(isAcceptedAmount(30000, payOwed({ ...base, minutesWorked: 480, endReason: "completed" }))).toBe(true);
  });
});

describe("parseRand", () => {
  it.each([
    ["30.23", 3023],
    ["R30.23", 3023],
    ["r 30,23", 3023],
    [" 35 ", 3500],
    ["35.5", 3550],
    ["0", 0],
  ])("reads %j as %d cents", (typed, cents) => {
    expect(parseRand(typed)).toBe(cents);
  });

  it.each(["", "R", "30.234", "-30", "30.2.3", "thirty", "1e3", "1234567"])("refuses %j", (typed) => {
    expect(parseRand(typed)).toBeNull();
  });
});
