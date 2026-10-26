import { describe, expect, it } from "vitest";
import { statusView, type BookingRecord } from "@/domain/bookings";
import { dayOptions, deadlineActions, decideBusinessNotOpen, decideSkipToDay, decideCheckIn, decideCheckOut, decideConfirm, decideMarkPaid, decideNoShow, demoDayOpen, methodsFor, payRecordCounters, unpaidPause, wasOnTime } from "@/domain/day";
import { fromSast } from "@/domain/time";

const owner = { uid: "sipho", demo: false };
const worker = { uid: "thabo", demo: false };
const stranger = { uid: "lerato", demo: false };
const START = fromSast(2026, 10, 27, 9, 0);
const ANSWERS = { onTime: true, didTheWork: false, wouldHireAgain: true };

const booking = (overrides: Partial<BookingRecord> = {}): BookingRecord => ({
  tryoutId: "t1", ownerId: "sipho", workerId: "thabo", demo: false, title: "Phone shop helper", businessName: "Sipho's Phone Repairs", businessArea: "Randburg",
  location: { latitude: -26.0939, longitude: 28.0071, accuracyMetres: 15 }, workerFirstName: "Thabo", workerArea: "Ivory Park", workerPayoutPhone: "27821234567", workerIdLastFour: "0087",
  startAt: START, endAt: fromSast(2026, 10, 27, 15, 0), hours: 6, rateCentsPerHour: 3500, payCents: 21000, status: "booked", bookedAt: fromSast(2026, 10, 25, 18, 0), ...overrides,
});
const secrets = { checkInCode: "482913" };
const door = { code: "482 913", faceMatches: true, nameMatches: true, lastFourMatches: true };

describe("check-in at the door", () => {
  it("checks in when the door check passes and the code matches, from an hour before the start", () => {
    expect(decideCheckIn(owner, booking(), secrets, door, fromSast(2026, 10, 27, 8, 0))).toEqual({ kind: "check_in" });
    expect(decideCheckIn(owner, booking(), secrets, door, fromSast(2026, 10, 27, 7, 59))).toEqual({ kind: "refuse", problem: "too_early" });
    expect(decideCheckIn(owner, booking(), secrets, door, fromSast(2026, 10, 27, 15, 0))).toEqual({ kind: "refuse", problem: "over" });
  });

  it("refuses without all three door checks, a wrong code, or after too many wrong codes", () => {
    const at = fromSast(2026, 10, 27, 9, 5);
    expect(decideCheckIn(owner, booking(), secrets, { ...door, faceMatches: false }, at)).toEqual({ kind: "refuse", problem: "door_check" });
    expect(decideCheckIn(owner, booking(), secrets, { ...door, code: "482914" }, at)).toEqual({ kind: "refuse", problem: "wrong_code" });
    expect(decideCheckIn(owner, booking(), { ...secrets, codeAttempts: 5 }, door, at)).toEqual({ kind: "refuse", problem: "locked" });
  });

  it("is the owner's alone, and twice changes nothing", () => {
    const at = fromSast(2026, 10, 27, 9, 5);
    expect(decideCheckIn(worker, booking(), secrets, door, at)).toEqual({ kind: "refuse", problem: "not_found" });
    expect(decideCheckIn(stranger, booking(), secrets, door, at)).toEqual({ kind: "refuse", problem: "not_found" });
    expect(decideCheckIn(owner, booking({ status: "checked_in" }), secrets, door, at)).toEqual({ kind: "unchanged" });
  });

  it("counts as on time up to 10 minutes after the start", () => {
    expect(wasOnTime({ startAt: START, checkedInAt: fromSast(2026, 10, 27, 9, 10) })).toBe(true);
    expect(wasOnTime({ startAt: START, checkedInAt: fromSast(2026, 10, 27, 9, 11) })).toBe(false);
  });
});

describe("no-shows", () => {
  it("lets the owner record one from 30 minutes after the start: nothing owed, the credit back, a strike, a review", () => {
    expect(decideNoShow(owner, "b1", booking(), fromSast(2026, 10, 27, 9, 29))).toEqual({ kind: "refuse", problem: "not_now" });
    const decision = decideNoShow(owner, "b1", booking(), fromSast(2026, 10, 27, 9, 30));
    expect(decision).toMatchObject({ kind: "end", settlement: { wage: null, credit: "release", strike: { party: "young_person", reason: "no_show" } }, review: { kind: "booking_review", reason: "no_show_marked" } });
  });

  it("lets the young person say the business wasn't open, after the start, which goes to review", () => {
    expect(decideBusinessNotOpen(worker, "b1", booking(), fromSast(2026, 10, 27, 8, 59))).toEqual({ kind: "refuse", problem: "not_now" });
    expect(decideBusinessNotOpen(worker, "b1", booking(), START)).toMatchObject({ kind: "review", review: { reason: "business_not_open", bookingId: "b1" } });
    expect(decideBusinessNotOpen(owner, "b1", booking(), START)).toEqual({ kind: "refuse", problem: "not_found" });
  });
});

describe("check-out, settled through settle()", () => {
  const inDay = booking({ status: "checked_in", checkedInAt: fromSast(2026, 10, 27, 9, 0) });

  it("owes the full day when the work is done, and uses the credit", () => {
    expect(decideCheckOut(owner, "b1", inDay, "completed", ANSWERS, fromSast(2026, 10, 27, 14, 0))).toMatchObject({ kind: "end", settlement: { wage: { amountCents: 21000, minimumCents: 21000 }, credit: "use" }, review: null });
    expect(decideCheckOut(owner, "b1", inDay, "business_ended_early", ANSWERS, fromSast(2026, 10, 27, 11, 0))).toMatchObject({ settlement: { wage: { amountCents: 21000 } } });
  });

  it("lets the owner lower it only when the young person left early, never below 4 hours", () => {
    expect(decideCheckOut(owner, "b1", inDay, "worker_left_early", ANSWERS, fromSast(2026, 10, 27, 11, 0))).toMatchObject({ settlement: { wage: { amountCents: 21000, minimumCents: 14000 } }, minutesWorked: 120 });
    expect(decideCheckOut(owner, "b1", inDay, "worker_left_early", ANSWERS, fromSast(2026, 10, 27, 14, 7))).toMatchObject({ settlement: { wage: { minimumCents: 18375 } } });
  });

  it("sends a safety stop to review, paying the hours worked with the 4-hour floor", () => {
    expect(decideCheckOut(owner, "b1", inDay, "safety", ANSWERS, fromSast(2026, 10, 27, 10, 0))).toMatchObject({ settlement: { wage: { amountCents: 14000, needsReview: true } }, review: { reason: "safety_stop" } });
  });

  it("keeps the owner's three answers with the ending, for the reference", () => {
    expect(decideCheckOut(owner, "b1", inDay, "completed", ANSWERS, fromSast(2026, 10, 27, 14, 0))).toMatchObject({ kind: "end", answers: ANSWERS });
  });

  it("needs a check-in first, and is the owner's alone", () => {
    expect(decideCheckOut(owner, "b1", booking(), "completed", ANSWERS, START)).toEqual({ kind: "refuse", problem: "not_now" });
    expect(decideCheckOut(worker, "b1", inDay, "completed", ANSWERS, START)).toEqual({ kind: "refuse", problem: "not_found" });
  });
});

describe("payment", () => {
  const ended = booking({ status: "ended", owedCents: 21000, owedMinimumCents: 14000, ended: { at: fromSast(2026, 10, 27, 15, 0), reason: "worker_left_early", minutesWorked: 120 }, payment: { state: "awaiting_payment" } });
  const now = fromSast(2026, 10, 27, 15, 5);

  it("takes at least the minimum owed, more is fine", () => {
    expect(decideMarkPaid(owner, ended, { method: "ewallet", amountCents: 14000 }, now)).toMatchObject({ kind: "paid", payment: { state: "awaiting_confirmation", method: "ewallet", amountCents: 14000 } });
    expect(decideMarkPaid(owner, ended, { method: "cash", amountCents: 25000 }, now)).toMatchObject({ kind: "paid" });
    expect(decideMarkPaid(owner, ended, { method: "cash", amountCents: 13999 }, now)).toEqual({ kind: "refuse", problem: "below_minimum" });
    expect(decideMarkPaid(owner, booking(), { method: "cash", amountCents: 21000 }, now)).toEqual({ kind: "refuse", problem: "not_payable" });
    expect(decideMarkPaid(worker, ended, { method: "cash", amountCents: 21000 }, now)).toEqual({ kind: "refuse", problem: "not_found" });
  });

  it("takes only the ways the young person chose; a booking from before the question takes any of the four", () => {
    const chose = booking({ ...ended, workerPayMethods: ["payshap", "cash"] });
    expect(methodsFor(chose)).toEqual(["payshap", "cash"]);
    expect(methodsFor(ended)).toEqual(["ewallet", "payshap", "cash_send", "cash"]);
    expect(decideMarkPaid(owner, chose, { method: "ewallet", amountCents: 21000 }, now)).toEqual({ kind: "refuse", problem: "method_not_offered" });
    expect(decideMarkPaid(owner, chose, { method: "payshap", amountCents: 21000 }, now).kind).toBe("paid");
  });

  it("keeps a reference for an electronic payment, trimmed to 40 characters, and never for cash", () => {
    expect(decideMarkPaid(owner, ended, { method: "cash_send", amountCents: 21000, reference: "  FS-THABO-27OCT  " }, now)).toMatchObject({ payment: { reference: "FS-THABO-27OCT" } });
    const long = decideMarkPaid(owner, ended, { method: "payshap", amountCents: 21000, reference: "x".repeat(60) }, now);
    expect(long.kind === "paid" && long.payment.reference).toHaveLength(40);
    const cash = decideMarkPaid(owner, ended, { method: "cash", amountCents: 21000, reference: "ignored" }, now);
    expect(cash.kind === "paid" && "reference" in cash.payment).toBe(false);
    const blank = decideMarkPaid(owner, ended, { method: "ewallet", amountCents: 21000, reference: "   " }, now);
    expect(blank.kind === "paid" && "reference" in blank.payment).toBe(false);
  });

  it("lets the young person answer once paid: received, or not received, which opens a review", () => {
    const paid = booking({ ...ended, payment: { state: "awaiting_confirmation", method: "ewallet", amountCents: 21000, markedPaidAt: now } });
    expect(decideConfirm(worker, "b1", paid, true, now)).toMatchObject({ kind: "answer", payment: { state: "received" }, review: null });
    expect(decideConfirm(worker, "b1", paid, false, now)).toMatchObject({ kind: "answer", payment: { state: "not_received" }, review: { reason: "not_received" } });
    expect(decideConfirm(worker, "b1", ended, true, now)).toEqual({ kind: "refuse", problem: "not_paid_yet" });
    expect(decideConfirm(owner, "b1", paid, true, now)).toEqual({ kind: "refuse", problem: "not_found" });
  });
});

describe("payment deadlines, from the clock", () => {
  const ended = booking({ status: "ended", owedCents: 21000, owedMinimumCents: 21000, ended: { at: fromSast(2026, 10, 27, 15, 0), reason: "completed", minutesWorked: 360 }, payment: { state: "awaiting_payment" } });

  it("pauses an unpaid business from 00:00 SAST, once", () => {
    expect(deadlineActions("b1", ended, null, fromSast(2026, 10, 27, 23, 59)).pauseBusiness).toBe(false);
    expect(deadlineActions("b1", ended, null, fromSast(2026, 10, 28, 0, 0)).pauseBusiness).toBe(true);
    expect(deadlineActions("b1", ended, unpaidPause("b1"), fromSast(2026, 10, 28, 0, 0)).pauseBusiness).toBe(false);
  });

  it("reminds the young person at 24 hours and sends it to review at 72, once", () => {
    const markedPaidAt = fromSast(2026, 10, 27, 15, 5);
    const paid = booking({ ...ended, payment: { state: "awaiting_confirmation", markedPaidAt } });
    expect(deadlineActions("b1", paid, null, fromSast(2026, 10, 28, 15, 0))).toEqual({ pauseBusiness: false, remindWorker: false, review: null });
    expect(deadlineActions("b1", paid, null, fromSast(2026, 10, 28, 15, 6)).remindWorker).toBe(true);
    expect(deadlineActions("b1", paid, null, fromSast(2026, 10, 30, 15, 6)).review).toMatchObject({ reason: "unconfirmed" });
    expect(deadlineActions("b1", { ...paid, reviewOpened: true }, null, fromSast(2026, 10, 30, 15, 6)).review).toBeNull();
  });

  it("treats a late cancellation's 4 hours like any other day's pay", () => {
    const cancelled = booking({ status: "cancelled", owedCents: 14000, cancellation: { by: "business", byUid: "sipho", at: fromSast(2026, 10, 27, 7, 0), kind: "late", reliedOnGrace: false } });
    expect(deadlineActions("c1", cancelled, null, fromSast(2026, 10, 28, 0, 0)).pauseBusiness).toBe(true);
    expect(decideMarkPaid(owner, cancelled, { method: "ewallet", amountCents: 14000 }, fromSast(2026, 10, 27, 8, 0)).kind).toBe("paid");
  });
});

describe("Paid on time: each payment counts once", () => {
  const due = fromSast(2026, 10, 27, 15, 0);
  const ended = booking({ status: "ended", owedCents: 21000, ended: { at: due, reason: "completed", minutesWorked: 360 } });
  const paidAt = (markedPaidAt: Date) => booking({ ...ended, payment: { state: "awaiting_confirmation", method: "ewallet", amountCents: 21000, markedPaidAt } });

  it("counts Received as on time when it was marked paid by 23:59 on the day it was due", () => {
    expect(payRecordCounters(paidAt(fromSast(2026, 10, 27, 23, 59)), "received")).toEqual(["payments", "paidOnTime"]);
    expect(payRecordCounters(paidAt(fromSast(2026, 10, 28, 0, 0)), "received")).toEqual(["payments"]);
  });

  it("counts a pause for being unpaid, or Not received, as not on time", () => {
    expect(payRecordCounters(ended, "paused_unpaid")).toEqual(["payments"]);
    expect(payRecordCounters(paidAt(fromSast(2026, 10, 27, 15, 5)), "not_received")).toEqual(["payments"]);
  });

  it("never counts the same tryout twice", () => {
    expect(payRecordCounters({ ...paidAt(fromSast(2026, 10, 27, 15, 5)), payCounted: true }, "received")).toBeNull();
  });
});

describe("what each side can do", () => {
  it("offers check-in and no-show to the owner, and 'wasn't open' to the young person, each only when it applies", () => {
    expect(dayOptions("business", booking(), fromSast(2026, 10, 27, 9, 35))).toMatchObject({ canCheckIn: true, canNoShow: true, canReportNotOpen: false, canCheckOut: false });
    expect(dayOptions("young_person", booking(), fromSast(2026, 10, 27, 9, 35))).toMatchObject({ canCheckIn: false, canNoShow: false, canReportNotOpen: true });
    expect(dayOptions("business", booking({ status: "checked_in" }), START)).toMatchObject({ canCheckOut: true, canCheckIn: false });
  });
});

describe("Skip to the day, demo only", () => {
  const demoOwner = { ...owner, demo: true };
  const demoWorker = { ...worker, demo: true };
  const demoBooking = booking({ demo: true });
  const evening = fromSast(2026, 10, 26, 21, 17);

  it("opens a demo booking's door now, for either party, and never touches its times", () => {
    for (const viewer of [demoOwner, demoWorker]) {
      const decision = decideSkipToDay(viewer, demoBooking, evening);
      expect(decision).toEqual({ kind: "skip", dayOpenedAt: evening });
      expect(decision).not.toHaveProperty("startAt");
      expect(decision).not.toHaveProperty("endAt");
    }
    expect(dayOptions("business", demoBooking, evening).canSkipToDay).toBe(true);
  });

  it("never opens a real booking, or anyone else's", () => {
    expect(decideSkipToDay(owner, booking(), evening)).toEqual({ kind: "refuse", problem: "not_demo" });
    expect(decideSkipToDay(demoOwner, booking(), evening)).toEqual({ kind: "refuse", problem: "not_demo" });
    expect(decideSkipToDay(owner, demoBooking, evening)).toEqual({ kind: "refuse", problem: "not_demo" });
    expect(decideSkipToDay({ ...stranger, demo: true }, demoBooking, evening)).toEqual({ kind: "refuse", problem: "not_found" });
    expect(decideSkipToDay(demoOwner, null, evening)).toEqual({ kind: "refuse", problem: "not_found" });
    expect(dayOptions("business", booking(), evening).canSkipToDay).toBe(false);
  });

  it("only while booked, and changes nothing once the door is open, by the clock or by an earlier skip", () => {
    expect(decideSkipToDay(demoOwner, booking({ demo: true, status: "checked_in" }), evening)).toEqual({ kind: "refuse", problem: "not_booked" });
    expect(decideSkipToDay(demoOwner, demoBooking, fromSast(2026, 10, 27, 8, 0))).toEqual({ kind: "unchanged" });
    expect(dayOptions("young_person", demoBooking, fromSast(2026, 10, 27, 8, 0)).canSkipToDay).toBe(false);
    const opened = booking({ demo: true, dayOpenedAt: evening });
    expect(decideSkipToDay(demoWorker, opened, fromSast(2026, 10, 26, 21, 30))).toEqual({ kind: "unchanged" });
    expect(dayOptions("young_person", opened, fromSast(2026, 10, 26, 21, 30)).canSkipToDay).toBe(false);
  });
});

describe("a demo day opened early", () => {
  const demoOwner = { ...owner, demo: true };
  const opened = booking({ demo: true, dayOpenedAt: fromSast(2026, 10, 26, 21, 17) });
  const nightBefore = fromSast(2026, 10, 26, 21, 30);

  it("lets the owner check in at any hour, so the day's panels show", () => {
    expect(demoDayOpen(opened)).toBe(true);
    expect(decideCheckIn(demoOwner, opened, secrets, door, nightBefore)).toEqual({ kind: "check_in" });
    expect(decideCheckIn(demoOwner, opened, secrets, door, fromSast(2026, 10, 27, 16, 0))).toEqual({ kind: "check_in" });
    expect(dayOptions("business", opened, nightBefore)).toMatchObject({ canCheckIn: true, canNoShow: false, canReportNotOpen: false, canSkipToDay: false });
    // The door check and the code still apply.
    expect(decideCheckIn(demoOwner, opened, secrets, { ...door, code: "000000" }, nightBefore)).toEqual({ kind: "refuse", problem: "wrong_code" });
  });

  it("refuses a real booking at the same hour exactly as before", () => {
    expect(decideCheckIn(owner, booking(), secrets, door, nightBefore)).toEqual({ kind: "refuse", problem: "too_early" });
    expect(dayOptions("business", booking(), nightBefore).canCheckIn).toBe(false);
  });

  it("never applies to a booking without the demo mark, even with the field set", () => {
    const unmarked = booking({ dayOpenedAt: fromSast(2026, 10, 26, 21, 17) });
    expect(demoDayOpen(unmarked)).toBe(false);
    expect(decideCheckIn(owner, unmarked, secrets, door, nightBefore)).toEqual({ kind: "refuse", problem: "too_early" });
    expect(decideCheckIn(owner, unmarked, secrets, door, fromSast(2026, 10, 27, 15, 0))).toEqual({ kind: "refuse", problem: "over" });
    expect(dayOptions("business", unmarked, nightBefore).canCheckIn).toBe(false);
    const inDay = { ...unmarked, status: "checked_in" as const, checkedInAt: nightBefore };
    expect(decideCheckOut(owner, "b1", inDay, "worker_left_early", ANSWERS, fromSast(2026, 10, 27, 16, 0))).toMatchObject({ minutesWorked: 1110 });
  });

  it("counts a check-in the night before as on time, and leaves the no-show at 30 minutes after the real start", () => {
    expect(wasOnTime({ startAt: START, checkedInAt: nightBefore })).toBe(true);
    expect(decideNoShow(demoOwner, "b1", opened, nightBefore)).toEqual({ kind: "refuse", problem: "not_now" });
    expect(dayOptions("business", opened, fromSast(2026, 10, 27, 9, 30)).canNoShow).toBe(true);
  });

  it("checks out with sensible hours: never below 0, never above the agreed 6, pay never below 4 hours", () => {
    const inDay = { ...opened, status: "checked_in" as const, checkedInAt: nightBefore };
    expect(decideCheckOut(demoOwner, "b1", inDay, "completed", ANSWERS, fromSast(2026, 10, 26, 21, 45))).toMatchObject({ settlement: { wage: { amountCents: 21000, minimumCents: 21000 } } });
    expect(decideCheckOut(demoOwner, "b1", inDay, "worker_left_early", ANSWERS, fromSast(2026, 10, 26, 21, 45))).toMatchObject({ settlement: { wage: { amountCents: 21000, minimumCents: 14000 } }, minutesWorked: 15 });
    expect(decideCheckOut(demoOwner, "b1", inDay, "safety", ANSWERS, fromSast(2026, 10, 27, 16, 0))).toMatchObject({ settlement: { wage: { amountCents: 21000 } }, minutesWorked: 360 });
    expect(decideCheckOut(demoOwner, "b1", inDay, "worker_left_early", ANSWERS, fromSast(2026, 10, 26, 21, 0))).toMatchObject({ settlement: { wage: { minimumCents: 14000 } }, minutesWorked: 0 });
  });

  it("is due by 23:59 on the tryout's own day, even when checked out the night before", () => {
    const ended = { ...opened, status: "ended" as const, checkedInAt: nightBefore, owedCents: 21000, owedMinimumCents: 21000, ended: { at: fromSast(2026, 10, 26, 21, 45), reason: "completed" as const, minutesWorked: 15 }, payment: { state: "awaiting_payment" as const } };
    expect(deadlineActions("b1", ended, null, fromSast(2026, 10, 27, 0, 0)).pauseBusiness).toBe(false);
    expect(deadlineActions("b1", ended, null, fromSast(2026, 10, 27, 23, 59)).pauseBusiness).toBe(false);
    expect(deadlineActions("b1", ended, null, fromSast(2026, 10, 28, 0, 0)).pauseBusiness).toBe(true);
    const paidAt = (markedPaidAt: Date) => ({ ...ended, payment: { state: "awaiting_confirmation" as const, method: "ewallet" as const, amountCents: 21000, markedPaidAt } });
    expect(payRecordCounters(paidAt(fromSast(2026, 10, 27, 12, 0)), "received")).toEqual(["payments", "paidOnTime"]);
    // Without the demo mark, the day it was checked out still counts, as before.
    expect(deadlineActions("b1", { ...ended, demo: false }, null, fromSast(2026, 10, 27, 0, 0)).pauseBusiness).toBe(true);
  });

  it("keeps the status page to the tryout's own day", () => {
    expect(statusView(opened, nightBefore)).toMatchObject({ startAt: START.toISOString() });
    expect(statusView(opened, fromSast(2026, 10, 28, 0, 0))).toBeNull();
  });
});
