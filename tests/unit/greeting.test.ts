import { describe, expect, it } from "vitest";
import { creditsLine, feedCountLine, greetingFor } from "@/domain/greeting";
import { fromSast } from "@/domain/time";

describe("the dashboard greeting", () => {
  it("follows the South African clock, not the server's", () => {
    expect(greetingFor(fromSast(2026, 10, 26, 6, 0))).toBe("Good morning");
    expect(greetingFor(fromSast(2026, 10, 26, 11, 59))).toBe("Good morning");
    expect(greetingFor(fromSast(2026, 10, 26, 12, 0))).toBe("Good afternoon");
    expect(greetingFor(fromSast(2026, 10, 26, 17, 59))).toBe("Good afternoon");
    expect(greetingFor(fromSast(2026, 10, 26, 18, 0))).toBe("Good evening");
    // 23:30 in Johannesburg is 21:30 UTC: still the evening here.
    expect(greetingFor(fromSast(2026, 10, 26, 23, 30))).toBe("Good evening");
  });

  it("says one useful thing from real numbers", () => {
    expect(creditsLine(3, true)).toBe("3 free tryouts ready to use.");
    expect(creditsLine(1, true)).toBe("1 free tryout ready to use.");
    expect(creditsLine(6, false)).toBe("6 credits ready to use.");
    expect(creditsLine(0, false)).toBe("No credits left. Request more under Credits.");
    expect(feedCountLine(4)).toBe("4 paid tryouts within reach right now.");
    expect(feedCountLine(1)).toBe("1 paid tryout within reach right now.");
    expect(feedCountLine(0)).toBe("No tryouts within reach right now.");
  });
});
