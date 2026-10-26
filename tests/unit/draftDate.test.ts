import { describe, expect, it } from "vitest";
import { namedDate, todayForPrompt } from "@/domain/draftDate";
import { fromSast } from "@/domain/time";

// Monday 26 October 2026, 08:00 in Johannesburg.
const MONDAY = fromSast(2026, 10, 26, 8, 0);

describe("the date on a drafted tryout", () => {
  it("tells the model today's date and weekday in South Africa, even late at night in UTC terms", () => {
    expect(todayForPrompt(MONDAY)).toBe("Monday 26 October 2026 (2026-10-26)");
    // 23:30 on Monday in Johannesburg is 21:30 UTC: still Monday here.
    expect(todayForPrompt(fromSast(2026, 10, 26, 23, 30))).toBe("Monday 26 October 2026 (2026-10-26)");
    expect(todayForPrompt(fromSast(2026, 10, 27, 0, 30))).toBe("Tuesday 27 October 2026 (2026-10-27)");
  });

  it("uses the day the owner named: the next such weekday, or today if it's today", () => {
    expect(namedDate("Help on Saturday morning in my phone shop", MONDAY)).toBe("2026-10-31");
    expect(namedDate("Someone for SATURDAYS", MONDAY)).toBe("2026-10-31");
    expect(namedDate("Need help this Monday", MONDAY)).toBe("2026-10-26");
    expect(namedDate("Helper on Sunday", MONDAY)).toBe("2026-11-01");
    expect(namedDate("Help today at the car wash", MONDAY)).toBe("2026-10-26");
    expect(namedDate("Help tomorrow with stock", MONDAY)).toBe("2026-10-27");
  });

  it("takes the first day named, and leaves the date empty when none is", () => {
    expect(namedDate("Friday or Saturday, packing shelves", MONDAY)).toBe("2026-10-30");
    expect(namedDate("Help packing stock and serving customers", MONDAY)).toBeNull();
    // A word that only starts with a day's name isn't one.
    expect(namedDate("The sundayer stall needs a helper", MONDAY)).toBeNull();
  });
});
