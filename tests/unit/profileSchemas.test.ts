import { describe, expect, it } from "vitest";
import { FIELD_MESSAGES, ID_PROBLEM_MESSAGES } from "@/domain/messages";
import { BusinessProfileSchema, SaMobileSchema, YoungPersonProfileSchema } from "@/schemas/profile";

const firstIssue = (result: { success: boolean; error?: { issues: { message: string }[] } }) => result.error?.issues[0]?.message;

describe("payout phone", () => {
  it.each(["0821234567", "082 123 4567", "+27 82 123 4567", "27821234567", "(082) 123-4567"])("normalises %s to 27821234567", (input) => {
    expect(SaMobileSchema.parse(input)).toBe("27821234567");
  });

  it("refuses landlines and short numbers with the field's own message", () => {
    expect(firstIssue(SaMobileSchema.safeParse("0111234567"))).toBe(FIELD_MESSAGES.payoutPhone);
    expect(firstIssue(SaMobileSchema.safeParse("08212345"))).toBe(FIELD_MESSAGES.payoutPhone);
  });
});

describe("young person profile", () => {
  const valid = { firstName: " Thabo ", area: "Ivory Park", availability: ["saturdays"], payoutPhone: "0821234567", idNumber: "000115 5800 087" };

  it("trims names and strips spaces from the ID number", () => {
    expect(YoungPersonProfileSchema.parse(valid)).toMatchObject({ firstName: "Thabo", idNumber: "0001155800087", payoutPhone: "27821234567" });
  });

  it("gives every field its own plain message, never a raw validation error", () => {
    expect(firstIssue(YoungPersonProfileSchema.safeParse({ ...valid, firstName: "" }))).toBe(FIELD_MESSAGES.firstNameEmpty);
    expect(firstIssue(YoungPersonProfileSchema.safeParse({ ...valid, firstName: "x".repeat(41) }))).toBe(FIELD_MESSAGES.firstNameLong);
    expect(firstIssue(YoungPersonProfileSchema.safeParse({ ...valid, availability: [] }))).toBe(FIELD_MESSAGES.availability);
    expect(firstIssue(YoungPersonProfileSchema.safeParse({ ...valid, availability: "saturdays" }))).toBe(FIELD_MESSAGES.availability);
    expect(firstIssue(YoungPersonProfileSchema.safeParse({ ...valid, idNumber: "12345" }))).toBe(ID_PROBLEM_MESSAGES.format);
    expect(firstIssue(YoungPersonProfileSchema.safeParse({ ...valid, area: undefined }))).toBe(FIELD_MESSAGES.workerArea);
  });
});

describe("business profile", () => {
  const valid = { name: "Sipho's Phone Repairs", area: "Midrand", openingHours: "Monday to Saturday, 8:00 to 17:00" };

  it("accepts a profile with or without a pin", () => {
    expect(BusinessProfileSchema.safeParse(valid).success).toBe(true);
    expect(BusinessProfileSchema.safeParse({ ...valid, location: { latitude: -25.99, longitude: 28.13 } }).success).toBe(true);
  });

  it("refuses a pin outside South Africa, or half a pin, with the pin's message", () => {
    expect(firstIssue(BusinessProfileSchema.safeParse({ ...valid, location: { latitude: 51.5, longitude: -0.12 } }))).toBe(FIELD_MESSAGES.pinOutsideSa);
    expect(firstIssue(BusinessProfileSchema.safeParse({ ...valid, location: { latitude: -25.99 } }))).toBe(FIELD_MESSAGES.pinOutsideSa);
  });
});
