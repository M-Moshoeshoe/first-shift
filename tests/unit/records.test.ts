import { describe, expect, it } from "vitest";
import type { BookingRecord } from "@/domain/bookings";
import { hireOfferDue } from "@/domain/hire";
import { decideReference, newReference, referenceDraftProblem, type ReferenceRecord } from "@/domain/references";
import { fromSast } from "@/domain/time";
import { isRecordToken, recordEntries, recordHours, sharedRecord } from "@/domain/workRecord";

const ANSWERS = { onTime: true, didTheWork: true, wouldHireAgain: false };
const START = fromSast(2026, 10, 27, 9, 0);

const booking = (overrides: Partial<BookingRecord> = {}): BookingRecord => ({
  tryoutId: "t1", ownerId: "sipho", workerId: "thabo", demo: false, title: "Phone shop helper", businessName: "Sipho's Phone Repairs", businessArea: "Randburg",
  location: { latitude: -26.0939, longitude: 28.0071, accuracyMetres: 15 }, workerFirstName: "Thabo", workerArea: "Ivory Park", workerPayoutPhone: "27821234567", workerIdLastFour: "0087",
  startAt: START, endAt: fromSast(2026, 10, 27, 15, 0), hours: 6, rateCentsPerHour: 3500, payCents: 21000, status: "ended", bookedAt: fromSast(2026, 10, 25, 18, 0),
  owedCents: 21000, ended: { at: fromSast(2026, 10, 27, 15, 0), reason: "completed", minutesWorked: 360, answers: ANSWERS },
  payment: { state: "received", method: "ewallet", amountCents: 21000 }, ...overrides,
});
const reference = (overrides: Partial<ReferenceRecord> = {}): ReferenceRecord => ({ workerId: "thabo", ownerId: "sipho", tryoutId: "t1", answers: ANSWERS, tasks: ["Greet customers"], text: "They arrived on time and greeted customers.", status: "draft", demo: false, ...overrides });

describe("writing a reference", () => {
  it("is for the young person it's about, only after Received, and only from the owner's answers", () => {
    expect(referenceDraftProblem("thabo", booking())).toBeNull();
    expect(referenceDraftProblem("sipho", booking())).toBe("not_found");
    expect(referenceDraftProblem("thabo", booking({ payment: { state: "awaiting_confirmation" } }))).toBe("not_received");
    expect(referenceDraftProblem("thabo", booking({ ended: { at: START, reason: "completed", minutesWorked: 360 } }))).toBe("no_answers");
  });

  it("keeps the answers and tasks it was written from, as a draft", () => {
    expect(newReference(booking(), ["Greet customers"], "  They did the work.  ")).toEqual({ workerId: "thabo", ownerId: "sipho", tryoutId: "t1", answers: ANSWERS, tasks: ["Greet customers"], text: "They did the work.", status: "draft", demo: false });
  });

  it("can't be challenged again once a challenge was rejected, but can still be added", () => {
    const rejected = reference({ challengeRejected: true });
    expect(decideReference("thabo", rejected, "b1", { action: "challenge", reason: "Not fair" })).toEqual({ kind: "refuse", problem: "already_decided" });
    expect(decideReference("thabo", rejected, "b1", { action: "approve" })).toEqual({ kind: "approve" });
  });
});

describe("the work record", () => {
  it("lists every tryout paid and confirmed by both, newest first, with its reference", () => {
    const later = booking({ startAt: fromSast(2026, 11, 3, 9, 0), businessName: "Lerato's Spaza" });
    const unpaid = booking({ payment: { state: "awaiting_confirmation" } });
    const entries = recordEntries([{ id: "b1", booking: booking() }, { id: "b2", booking: later }, { id: "b3", booking: unpaid }], new Map([["b1", reference({ status: "approved" })]]));
    expect(entries.map((entry) => entry.bookingId)).toEqual(["b2", "b1"]);
    expect(entries[1]).toMatchObject({ businessName: "Sipho's Phone Repairs", day: "Tue 27 Oct", hours: 6, reference: { status: "approved" } });
    expect(entries[0]?.reference).toBeNull();
  });

  it("shows the hours worked when the young person left early, in quarter hours", () => {
    expect(recordHours(booking({ ended: { at: START, reason: "worker_left_early", minutesWorked: 140 } }))).toBe(2.25);
    expect(recordHours(booking({ ended: { at: START, reason: "finished_early", minutesWorked: 140 } }))).toBe(6);
  });

  it("shares approved references only, and never an id, a surname or a number", () => {
    const entries = recordEntries(
      [{ id: "b1", booking: booking() }, { id: "b2", booking: booking({ title: "Stock count helper" }) }],
      new Map([["b1", reference({ status: "approved" })], ["b2", reference({ status: "challenged" })]]),
    );
    const shared = sharedRecord("Thabo", entries);
    expect(shared.entries.map((entry) => entry.reference?.text ?? null)).toEqual(["They arrived on time and greeted customers.", null]);
    expect(JSON.stringify(shared)).not.toMatch(/b1|thabo"|27821234567|0087|Mokoena/);
  });

  it("takes only 24-character share tokens", () => {
    expect(isRecordToken("abcdefghijklmnopqrstuvwx")).toBe(true);
    expect(isRecordToken("short")).toBe(false);
    expect(isRecordToken("abcdefghijklmnopqrstuvw/")).toBe(false);
  });
});

describe("offering a job", () => {
  const now = fromSast(2026, 10, 28, 12, 0);
  it("is due after three tryouts together, once", () => {
    expect(hireOfferDue(2, [], now, false)).toBe(false);
    expect(hireOfferDue(3, [], now, false)).toBe(true);
    expect(hireOfferDue(3, [], now, true)).toBe(false);
  });

  it("is due when even a 4-hour tryout more this month would reach the 24-hour line", () => {
    const slots = [
      { startAt: fromSast(2026, 10, 5, 9, 0), hours: 8 },
      { startAt: fromSast(2026, 10, 12, 9, 0), hours: 8 },
    ];
    expect(hireOfferDue(2, slots, now, false)).toBe(false);
    expect(hireOfferDue(2, [...slots, { startAt: fromSast(2026, 10, 27, 9, 0), hours: 4 }], now, false)).toBe(true);
  });
});
