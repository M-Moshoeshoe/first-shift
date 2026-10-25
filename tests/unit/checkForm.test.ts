import { describe, expect, it } from "vitest";
import { checkForm, dayPay, HOUR_CHOICES, initialCheck, MINIMUM_RATE_TEXT, type CheckDraft } from "@/app/(account)/business/post/_components/checkForm";
import { TERMS_MESSAGES, TRYOUT_FIELD_MESSAGES } from "@/domain/tryoutMessages";

// Monday 26 October 2026, 08:00 in Johannesburg.
const NOW = new Date("2026-10-26T06:00:00Z");
const description = "Help sorting stock and serving customers on Saturday";
const draft = { title: "Shop helper", tasks: ["Pack bread onto the shelves"], hours: 8 };
const form = (overrides: Partial<CheckDraft> = {}): CheckDraft => ({ ...initialCheck(draft, NOW), supervision: true, ...overrides });

describe("initialCheck", () => {
  it("starts tomorrow at 09:00, at the suggested hours and the minimum wage, unconfirmed", () => {
    expect(initialCheck(draft, NOW)).toEqual({ ...draft, date: "2026-10-27", startTime: "09:00", rate: "30.23", supervision: false });
  });

  it("offers 4 to 8 hours", () => {
    expect(HOUR_CHOICES).toEqual([4, 5, 6, 7, 8]);
    expect(MINIMUM_RATE_TEXT).toBe("30.23");
  });
});

describe("dayPay", () => {
  it("is the rate times the hours, R241.84 for 8 hours at the minimum wage", () => {
    expect(dayPay({ rate: "30.23", hours: 8 })).toBe(24184);
    expect(dayPay({ rate: "40", hours: 4 })).toBe(16000);
    expect(dayPay({ rate: "forty", hours: 4 })).toBeNull();
  });
});

describe("checkForm", () => {
  it("passes a valid tryout and builds what the server receives", () => {
    const { errors, input } = checkForm(form(), description, NOW);
    expect(errors).toEqual({});
    expect(input).toEqual({ description, title: "Shop helper", tasks: ["Pack bread onto the shelves"], date: "2026-10-27", startTime: "09:00", hours: 8, rateCentsPerHour: 3023, supervisionConfirmed: true });
  });

  it("puts each rule problem next to the field that fixes it", () => {
    expect(checkForm(form({ rate: "29.99" }), description, NOW).errors).toEqual({ rate: TERMS_MESSAGES.below_minimum_wage });
    expect(checkForm(form({ date: "2026-10-26", startTime: "09:00" }), description, NOW).errors).toEqual({ startTime: TERMS_MESSAGES.too_soon });
    expect(checkForm(form({ startTime: "11:00" }), description, NOW).errors).toEqual({ startTime: TERMS_MESSAGES.outside_daylight });
    expect(checkForm(form({ date: "" }), description, NOW).errors).toEqual({ date: TERMS_MESSAGES.invalid_date });
  });

  it("asks for the supervision promise, a number for the rate, and real tasks", () => {
    const { errors, input } = checkForm(form({ supervision: false, rate: "abc", tasks: ["", "Pack"] }), description, NOW);
    expect(errors).toEqual({ supervision: TRYOUT_FIELD_MESSAGES.supervision, rate: TRYOUT_FIELD_MESSAGES.rate, tasks: TRYOUT_FIELD_MESSAGES.tasks });
    expect(input).toBeNull();
  });
});
