import { describe, expect, it } from "vitest";
import { RULES } from "@/config/rules";
import { hasOpenSafetyReport, newReport, pausesBusinessAtOnce, REPORT_CATEGORIES } from "@/domain/cases";
import { injuryCoverLine } from "@/domain/injuryCover";
import { decideBusinessSave } from "@/domain/profileDecisions";
import { BusinessDetailsSchema } from "@/schemas/profile";
import { owner, shop } from "./support/tryoutFakes";
import { decideReference, shareableReferences, type ReferenceRecord } from "@/domain/references";
import { crossesRegularEmploymentLine, hoursInSastMonth } from "@/domain/regularEmployment";
import { accountStatus } from "@/domain/strikes";
import { fromSast } from "@/domain/time";

const slot = (month: number, day: number, hours: number, hour = 9) => ({ startAt: fromSast(2026, month, day, hour, 0), hours });

describe("the 24-hour line", () => {
  it("allows a booking that keeps the pair under 24 hours in the month, and refuses one that reaches it", () => {
    expect(crossesRegularEmploymentLine([slot(11, 2, 8), slot(11, 9, 8)], slot(11, 16, 7))).toBe(false);
    expect(crossesRegularEmploymentLine([slot(11, 2, 8), slot(11, 9, 8)], slot(11, 16, 8))).toBe(true);
    expect(crossesRegularEmploymentLine([], slot(11, 2, RULES.regularEmploymentHoursPerMonth))).toBe(true);
  });

  it("counts calendar months in South African time, so a new month starts afresh", () => {
    // 1 November 00:30 SAST is still 31 October in UTC: it counts towards November.
    const earlyFirst = { startAt: fromSast(2026, 11, 1, 0, 30), hours: 8 };
    expect(hoursInSastMonth([earlyFirst], fromSast(2026, 11, 20, 9, 0))).toBe(8);
    expect(hoursInSastMonth([earlyFirst], fromSast(2026, 10, 31, 9, 0))).toBe(0);
    expect(crossesRegularEmploymentLine([slot(10, 20, 8), slot(10, 27, 8)], slot(11, 3, 8))).toBe(false);
  });

  it("ignores other years' same month", () => {
    expect(hoursInSastMonth([{ startAt: fromSast(2025, 11, 2, 9, 0), hours: 8 }], fromSast(2026, 11, 2, 9, 0))).toBe(0);
  });
});

describe("injury cover", () => {
  it("is confirmed only when the business says it's registered", () => {
    expect(injuryCoverLine("registered")).toBe("Injury cover: confirmed by the business");
    for (const answer of ["not_registered", "not_sure", undefined] as const) expect(injuryCoverLine(answer)).toBe("Injury cover: not confirmed");
  });
});

describe("the COIDA question in business onboarding", () => {
  const details = { name: "Lerato's Spaza", area: "Tembisa", openingHours: "Monday to Saturday, 8:00 to 17:00" };

  it("must be answered on the details step", () => {
    expect(BusinessDetailsSchema.safeParse(details).success).toBe(false);
    expect(BusinessDetailsSchema.safeParse({ ...details, coida: "not_sure" }).success).toBe(true);
  });

  it("is saved, changed, and kept by a later save that doesn't send it", () => {
    const saved = decideBusinessSave(owner, shop, { ...details, coida: "registered" });
    expect(saved).toMatchObject({ kind: "save", next: { coida: "registered" } });
    const withAnswer = { ...shop, coida: "registered" as const };
    expect(decideBusinessSave(owner, withAnswer, details)).toEqual({ kind: "unchanged" });
    expect(decideBusinessSave(owner, withAnswer, { ...details, coida: "not_registered" })).toMatchObject({ kind: "save", next: { coida: "not_registered" } });
  });
});

describe("references", () => {
  const draft: ReferenceRecord = {
    workerId: "thabo",
    ownerId: "sipho",
    tryoutId: "t1",
    answers: { onTime: true, didTheWork: true, wouldHireAgain: true },
    demo: false,
    tasks: ["Pack shelves"],
    text: "Thabo arrived on time and packed the shelves well.",
    status: "draft",
  };

  it("lets the young person approve a draft, or challenge it, which opens a review case", () => {
    expect(decideReference("thabo", draft, "r1", { action: "approve" })).toEqual({ kind: "approve" });
    expect(decideReference("thabo", draft, "r1", { action: "challenge", reason: "  I packed and served customers  " })).toEqual({
      kind: "challenge",
      reviewCase: { kind: "reference_challenge", referenceId: "r1", workerId: "thabo", ownerId: "sipho", reason: "I packed and served customers", status: "open" },
    });
  });

  it("treats someone else's reference as not found, a repeat as unchanged, and a decided one as final", () => {
    expect(decideReference("sipho", draft, "r1", { action: "approve" })).toEqual({ kind: "refuse", problem: "not_found" });
    expect(decideReference("thabo", null, "r1", { action: "approve" })).toEqual({ kind: "refuse", problem: "not_found" });
    expect(decideReference("thabo", { ...draft, status: "approved" }, "r1", { action: "approve" })).toEqual({ kind: "unchanged" });
    expect(decideReference("thabo", { ...draft, status: "approved" }, "r1", { action: "challenge", reason: "x" })).toEqual({ kind: "refuse", problem: "already_decided" });
    expect(decideReference("thabo", { ...draft, status: "challenged" }, "r1", { action: "approve" })).toEqual({ kind: "refuse", problem: "already_decided" });
  });

  it("shares approved references only", () => {
    const all = [draft, { ...draft, status: "approved" as const }, { ...draft, status: "challenged" as const }];
    expect(shareableReferences(all).map((reference) => reference.status)).toEqual(["approved"]);
  });
});

describe("reports", () => {
  it("pauses the business at once for harassment, unsafe work and asking a young person for money only", () => {
    expect(REPORT_CATEGORIES.filter(pausesBusinessAtOnce)).toEqual(["harassment", "unsafe_work", "asked_for_money"]);
  });

  it("feeds an open safety report into the business's status, until the case is closed", () => {
    const now = new Date("2026-10-26T08:00:00Z");
    const report = newReport({ category: "harassment", tryoutId: "t1", reporterId: "thabo", businessId: "sipho", note: " He shouted at me " });
    expect(report).toMatchObject({ kind: "report", note: "He shouted at me", status: "open" });
    expect(accountStatus({ now, strikes: [], hasOpenSafetyReport: hasOpenSafetyReport([report], "sipho") }).status).toBe("paused");
    expect(hasOpenSafetyReport([{ ...report, status: "closed" }], "sipho")).toBe(false);
    expect(hasOpenSafetyReport([report], "lerato")).toBe(false);
    expect(hasOpenSafetyReport([newReport({ category: "other", tryoutId: "t1", reporterId: "thabo", businessId: "sipho", note: "" })], "sipho")).toBe(false);
  });
});
