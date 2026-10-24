import { describe, expect, it } from "vitest";
import { validateTryoutWindow } from "@/domain/schedule";
import {
  buildTryoutWindow,
  checkText,
  suggestHours,
  transition,
  TRYOUT_ACTIONS,
  TRYOUT_STATUSES,
  type TryoutAction,
  type TryoutStatus,
} from "@/domain/tryout";

describe("transition", () => {
  const allowed: Record<string, TryoutStatus> = {
    "review approve": "published",
    "review withdraw": "withdrawn",
    "published book": "booked",
    "published withdraw": "withdrawn",
    "booked complete": "completed",
  };

  const moves = TRYOUT_STATUSES.flatMap((status) => TRYOUT_ACTIONS.map((action): [TryoutStatus, TryoutAction] => [status, action]));

  it.each(moves)("%s on %s", (status, action) => {
    const expected = allowed[`${status} ${action}`];
    expect(transition(status, action)).toEqual(expected ? { ok: true, value: expected } : { ok: false, error: "not_allowed" });
  });

  it("publishes a review tryout only through approval", () => {
    const routes = TRYOUT_ACTIONS.filter((action) => {
      const result = transition("review", action);
      return result.ok && result.value === "published";
    });
    expect(routes).toEqual(["approve"]);
  });

  it("refuses to withdraw a booked tryout", () => {
    expect(transition("booked", "withdraw").ok).toBe(false);
  });
});

describe("buildTryoutWindow", () => {
  it("converts South African time to UTC", () => {
    expect(buildTryoutWindow("2026-10-24", "09:00", 8)).toEqual({
      ok: true,
      value: { start: new Date("2026-10-24T07:00:00Z"), end: new Date("2026-10-24T15:00:00Z") },
    });
  });

  it("puts an early start on the previous UTC day", () => {
    const result = buildTryoutWindow("2026-10-25", "01:30", 4);
    expect(result.ok && result.value.start).toEqual(new Date("2026-10-24T23:30:00Z"));
  });

  it("crosses month and year ends backwards into UTC", () => {
    const november = buildTryoutWindow("2026-11-01", "00:15", 4);
    const newYear = buildTryoutWindow("2027-01-01", "01:00", 4);
    expect(november.ok && november.value.start).toEqual(new Date("2026-10-31T22:15:00Z"));
    expect(newYear.ok && newYear.value.start).toEqual(new Date("2026-12-31T23:00:00Z"));
  });

  it("lets an evening window run into the next month, for validateTryoutWindow to refuse", () => {
    const result = buildTryoutWindow("2026-10-31", "20:00", 8);
    expect(result.ok && result.value.end).toEqual(new Date("2026-11-01T02:00:00Z"));
    if (result.ok) {
      const checked = validateTryoutWindow(new Date("2026-10-30T00:00:00Z"), result.value);
      expect(!checked.ok && checked.error).toEqual(expect.arrayContaining(["spans_days", "outside_daylight"]));
    }
  });

  it("accepts 29 February only in a leap year", () => {
    expect(buildTryoutWindow("2028-02-29", "09:00", 4).ok).toBe(true);
    expect(buildTryoutWindow("2027-02-29", "09:00", 4)).toEqual({ ok: false, error: "invalid_date" });
  });

  it.each(["2026-02-30", "2026-13-01", "2026-04-31", "26-10-24", "2026-10-24T09:00", ""])("refuses the date %j", (date) => {
    expect(buildTryoutWindow(date, "09:00", 4)).toEqual({ ok: false, error: "invalid_date" });
  });

  it.each(["24:00", "9:00", "09:60", "09:00:00", ""])("refuses the start time %j", (time) => {
    expect(buildTryoutWindow("2026-10-24", time, 4)).toEqual({ ok: false, error: "invalid_time" });
  });

  it.each([0, -4, Number.NaN, Number.POSITIVE_INFINITY])("refuses %d hours", (hours) => {
    expect(buildTryoutWindow("2026-10-24", "09:00", hours)).toEqual({ ok: false, error: "invalid_hours" });
  });
});

describe("suggestHours", () => {
  it.each([
    [1, 4],
    [4, 4],
    [5.4, 5],
    [6.5, 7],
    [8, 8],
    [12, 8],
    [Number.NaN, 4],
  ])("turns %d into %d", (aiHours, expected) => {
    expect(suggestHours(aiHours)).toBe(expected);
  });
});

describe("checkText", () => {
  it("joins the title, tasks and request in a fixed order", () => {
    expect(checkText("Shop helper", ["Pack shelves", "Greet customers"], "Help in my spaza on Saturday")).toBe(
      "Title: Shop helper\nTasks:\n- Pack shelves\n- Greet customers\nRequest: Help in my spaza on Saturday",
    );
  });

  it("sends only the request at the draft step", () => {
    expect(checkText("", [], "Help in my spaza")).toBe("Request: Help in my spaza");
  });

  it("trims every part and leaves out blank tasks", () => {
    expect(checkText("  Shop helper ", ["  ", " Pack shelves "], " Help ")).toBe("Title: Shop helper\nTasks:\n- Pack shelves\nRequest: Help");
  });

  it("includes an edited-in task, so publishing checks what the owner changed", () => {
    expect(checkText("Shop helper", ["Pack shelves", "Rewire the DB board"], "Help in my spaza")).toContain("Rewire the DB board");
  });
});
