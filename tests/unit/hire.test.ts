import { RULES } from "@/config/rules";
import { describe, expect, it } from "vitest";
import { type HireOfferRecord, decideHireAnswer, decideHireOutcome, jobDetails, jobOfferProblem, recordJobs, shouldPromptHire } from "@/domain/hire";

describe("shouldPromptHire", () => {
  it("prompts after three tryouts with the same person, once", () => {
    expect(shouldPromptHire(2, false)).toBe(false);
    expect(shouldPromptHire(3, false)).toBe(true);
    expect(shouldPromptHire(5, true)).toBe(false);
  });
});

describe("a job offer's details, answers and outcome", () => {
  const offer: HireOfferRecord = {
    ownerId: "sipho", workerId: "thabo", businessName: "Sipho's Phone Repairs", bookingId: "b1", demo: false, at: new Date("2026-10-27T14:00:00Z"),
    kind: "offer", details: { role: "Shop assistant", daysPerWeek: 5, rateCentsPerHour: 3500 }, message: "", answer: null, outcome: null,
    workerFirstName: "Thabo", ownerFirstName: "Sipho", ownerPhone: "27831234567",
  };
  const job = { kind: "offer" as const, role: "Shop assistant", daysPerWeek: 5, rateCentsPerHour: RULES.minimumWageCentsPerHour, message: "" };

  it("accepts an offer at the minimum wage or more, 1 to 6 days a week, with a role", () => {
    expect(jobOfferProblem(job)).toBeNull();
    expect(jobOfferProblem({ ...job, rateCentsPerHour: RULES.minimumWageCentsPerHour - 1 })).toBe("below_minimum_wage");
    expect(jobOfferProblem({ ...job, daysPerWeek: 0 })).toBe("days");
    expect(jobOfferProblem({ ...job, daysPerWeek: 7 })).toBe("days");
    expect(jobOfferProblem({ ...job, daysPerWeek: 2.5 })).toBe("days");
    expect(jobOfferProblem({ ...job, role: " " })).toBe("role");
    expect(jobOfferProblem({ ...job, message: "x".repeat(RULES.jobMessageMaxChars + 1) })).toBe("message");
    expect(jobOfferProblem({ kind: "talk", message: "" })).toBeNull();
    expect(jobDetails({ kind: "talk", message: "" })).toBeNull();
    expect(jobDetails({ ...job, role: "  Shop assistant " })).toEqual({ role: "Shop assistant", daysPerWeek: 5, rateCentsPerHour: RULES.minimumWageCentsPerHour });
  });

  it("is answered once, by the young person it was made to", () => {
    expect(decideHireAnswer("thabo", offer, "not_now")).toEqual({ kind: "answer" });
    expect(decideHireAnswer("sipho", offer, "not_now")).toEqual({ kind: "refuse", problem: "not_found" });
    expect(decideHireAnswer("thabo", null, "not_now")).toEqual({ kind: "refuse", problem: "not_found" });
    expect(decideHireAnswer("thabo", { ...offer, answer: "not_now" }, "not_now")).toEqual({ kind: "unchanged" });
    expect(decideHireAnswer("thabo", { ...offer, answer: "not_now" }, "interested")).toEqual({ kind: "refuse", problem: "already_answered" });
  });

  it("is marked once, by the owner who made it, and the record shows it", () => {
    expect(decideHireOutcome("sipho", offer, "hired")).toEqual({ kind: "mark" });
    expect(decideHireOutcome("thabo", offer, "hired")).toEqual({ kind: "refuse", problem: "not_found" });
    expect(decideHireOutcome("sipho", { ...offer, outcome: "hired" }, "did_not_work_out")).toEqual({ kind: "refuse", problem: "already_marked" });
    expect(recordJobs([offer, { ...offer, businessName: "Lerato's Spaza", outcome: "hired" }])).toEqual([
      { businessName: "Sipho's Phone Repairs", hired: false },
      { businessName: "Lerato's Spaza", hired: true },
    ]);
  });
});
