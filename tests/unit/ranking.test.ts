import { describe, expect, it } from "vitest";
import { shortlist, type Applicant } from "@/domain/ranking";

const applicant = (id: string, overrides: Partial<Applicant> = {}): Applicant => ({
  id,
  fit: 0.8,
  showUpScore: 90,
  rating: 4.5,
  distanceKm: 3,
  completedTryouts: 4,
  ...overrides,
});

describe("shortlist", () => {
  it("puts the strongest applicants first", () => {
    const result = shortlist([applicant("weak", { fit: 0.2, showUpScore: 40 }), applicant("strong")], 2);
    expect(result.map((entry) => entry.id)).toEqual(["strong", "weak"]);
  });

  it("keeps one place for a first-timer who would otherwise miss out", () => {
    const experienced = ["a", "b", "c"].map((id) => applicant(id));
    const firstTimer = applicant("new", { completedTryouts: 0, showUpScore: 70, rating: null, fit: 0.5 });
    const result = shortlist([...experienced, firstTimer], 3);
    expect(result.map((entry) => entry.id)).toContain("new");
    expect(result.find((entry) => entry.id === "new")?.firstTimerPlace).toBe(true);
  });

  it("doesn't force the place when a first-timer already made the list", () => {
    const result = shortlist([applicant("new", { completedTryouts: 0 }), applicant("b")], 2);
    expect(result.every((entry) => !entry.firstTimerPlace)).toBe(true);
  });
});
