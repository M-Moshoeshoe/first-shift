import { describe, expect, it } from "vitest";
import { checkSaId } from "@/domain/saId";

const today = new Date("2026-10-24T00:00:00Z");

describe("checkSaId", () => {
  it("accepts a valid adult citizen and keeps only the last four digits", () => {
    const result = checkSaId("0001155800087", today);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.age).toBe(26);
      expect(result.value.residency).toBe("citizen");
      expect(result.value.lastFour).toBe("0087");
    }
  });

  it("recognises permanent residents and leap-day birthdays", () => {
    const resident = checkSaId("9507304123180", today);
    expect(resident.ok && resident.value.residency).toBe("permanent_resident");
    expect(checkSaId("0402290012085", today).ok).toBe(true);
  });

  it("rejects typos, impossible dates and unknown residency digits", () => {
    expect(checkSaId("0001155800088", today)).toEqual({ ok: false, error: "check_digit" });
    expect(checkSaId("9913325800087", today)).toEqual({ ok: false, error: "date_of_birth" });
    expect(checkSaId("9906065011289", today)).toEqual({ ok: false, error: "citizenship_digit" });
    expect(checkSaId("12345", today)).toEqual({ ok: false, error: "format" });
  });

  it("rejects anyone under 18", () => {
    expect(checkSaId("1003035011082", today)).toEqual({ ok: false, error: "under_age" });
  });
});
