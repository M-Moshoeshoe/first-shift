import { describe, expect, it } from "vitest";
import type { ReportCategory, ReviewCase } from "@/domain/cases";
import { pilotMetrics, weekOf } from "@/domain/pilotMetrics";
import { caseParties, casePriority, decideResolution, orderCases } from "@/domain/review";
import { fromSast } from "@/domain/time";

const report = (category: ReportCategory, reporterId = "thabo"): ReviewCase => ({ kind: "report", category, tryoutId: "t1", reporterId, businessId: "sipho", note: "", status: "open" });
const challenge: ReviewCase = { kind: "reference_challenge", referenceId: "b1", workerId: "thabo", ownerId: "sipho", reason: "Not true", status: "open" };
const credits: ReviewCase = { kind: "credit_request", businessId: "sipho", status: "open" };
const notReceived: ReviewCase = { kind: "booking_review", reason: "not_received", bookingId: "b1", businessId: "sipho", workerId: "thabo", status: "open" };

describe("the review list's order", () => {
  it("puts safety first, then payment, then references, then tryouts and credit requests", () => {
    expect([report("harassment"), report("asked_for_money"), notReceived, report("not_paid"), report("paid_too_much"), challenge, credits, report("other")].map(casePriority)).toEqual([
      "safety", "safety", "payment", "payment", "payment", "references", "tryouts_and_credits", "tryouts_and_credits",
    ]);
    expect(casePriority({ ...notReceived, reason: "safety_stop" })).toBe("safety");
  });

  it("orders by priority, oldest first within one", () => {
    const cases = [
      { id: "credits", item: credits, openedAt: fromSast(2026, 10, 20, 9, 0) },
      { id: "late-safety", item: report("harassment"), openedAt: fromSast(2026, 10, 26, 9, 0) },
      { id: "early-safety", item: report("unsafe_work"), openedAt: fromSast(2026, 10, 25, 9, 0) },
      { id: "payment", item: notReceived, openedAt: fromSast(2026, 10, 19, 9, 0) },
    ];
    expect(orderCases(cases).map((item) => item.id)).toEqual(["early-safety", "late-safety", "payment", "credits"]);
  });
});

describe("resolving a case", () => {
  const parties = { businessId: "sipho", workerId: "thabo" };
  const ok = { outcome: "Paid in the end", reason: "Bank screenshot shows the payment", admin: "mokhachane", actions: [] };

  it("needs an outcome, the reasoning and the admin's name, on an open case", () => {
    expect(decideResolution(notReceived, parties, ok)).toEqual({ kind: "resolve" });
    expect(decideResolution({ ...notReceived, status: "closed" }, parties, ok)).toEqual({ kind: "refuse", problem: "closed" });
    expect(decideResolution(notReceived, parties, { ...ok, reason: "" })).toEqual({ kind: "refuse", problem: "reason" });
    expect(decideResolution(notReceived, parties, { ...ok, outcome: "x" })).toEqual({ kind: "refuse", problem: "outcome" });
    expect(decideResolution(notReceived, parties, { ...ok, admin: "not a name!" })).toEqual({ kind: "refuse", problem: "admin" });
  });

  it("decides a reference only on a challenge, acts on a young person only when the case names one, and grants 1 to 50", () => {
    expect(decideResolution(notReceived, parties, { ...ok, actions: [{ kind: "reference", verdict: "uphold" }] })).toEqual({ kind: "refuse", problem: "reference_only" });
    expect(decideResolution(challenge, parties, { ...ok, actions: [{ kind: "reference", verdict: "reject" }] })).toEqual({ kind: "resolve" });
    expect(decideResolution(credits, { businessId: "sipho", workerId: null }, { ...ok, actions: [{ kind: "pause", party: "young_person" }] })).toEqual({ kind: "refuse", problem: "no_young_person" });
    expect(decideResolution(credits, { businessId: "sipho", workerId: null }, { ...ok, actions: [{ kind: "grant", amount: 51 }] })).toEqual({ kind: "refuse", problem: "grant" });
    expect(decideResolution(credits, { businessId: "sipho", workerId: null }, { ...ok, actions: [{ kind: "grant", amount: 5 }] })).toEqual({ kind: "resolve" });
  });

  it("finds who a case is about, even a report the business made", () => {
    expect(caseParties(report("harassment"), null)).toEqual(parties);
    expect(caseParties(report("paid_too_much", "sipho"), "thabo")).toEqual(parties);
    expect(caseParties(report("paid_too_much", "sipho"), null)).toEqual({ businessId: "sipho", workerId: null });
    expect(caseParties(challenge, null)).toEqual(parties);
    expect(caseParties(credits, "thabo")).toEqual({ businessId: "sipho", workerId: null });
  });
});

describe("pilot metrics", () => {
  it("weeks run Monday to Sunday, South African time", () => {
    expect(weekOf(fromSast(2026, 10, 26, 0, 30))).toBe("2026-10-26");
    expect(weekOf(fromSast(2026, 11, 1, 23, 30))).toBe("2026-10-26");
    expect(weekOf(fromSast(2026, 11, 2, 0, 5))).toBe("2026-11-02");
  });

  it("counts completed and paid tryouts, the on-time rate, repeat businesses, safety reports, references and job offers", () => {
    const day = (n: number, hour = 9) => fromSast(2026, 10, n, hour, 0);
    const paid = (owner: string, n: number, markedHour: number) => ({ ownerId: owner, startAt: day(n), dueAt: day(n, 15), markedPaidAt: day(n, markedHour), received: true });
    const rows = pilotMetrics({
      bookings: [paid("sipho", 26, 16), paid("sipho", 27, 16), { ...paid("lerato", 28, 16), markedPaidAt: fromSast(2026, 10, 29, 8, 0) }, { ownerId: "ayanda", startAt: day(29), dueAt: day(29, 15), markedPaidAt: null, received: false }],
      cases: [{ kind: "report", detail: "harassment", openedAt: day(27, 10), closedAt: day(27, 22) }, { kind: "booking_review", detail: "not_received", openedAt: day(28), closedAt: null }],
      references: [{ status: "approved", challenged: false, at: day(26) }, { status: "challenged", challenged: true, at: day(27) }],
      hireOffers: [day(28)],
    });
    expect(rows.map((row) => row.week)).toEqual(["2026-10-26", "total"]);
    expect(rows.at(-1)).toEqual({
      week: "total",
      completedAndPaid: 3,
      paidOnTimeRate: "67% (2 of 3)",
      repeatBusinesses: 1,
      safetyReports: "1: harassment 1",
      safetyHoursToClose: "longest 12.0 h",
      referencesApproved: "50% (1 of 2)",
      challenges: 1,
      hireOffers: 1,
    });
  });
});
