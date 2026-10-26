import { describe, expect, it } from "vitest";
import { applicationId } from "@/domain/applications";
import { CHECK_IN_MESSAGES, MARK_PAID_MESSAGES } from "@/domain/dayMessages";
import { fromSast } from "@/domain/time";
import { AppError } from "@/server/errors";
import { createBookingFakes } from "./support/bookingFakes";
import { thabo, tryoutAt } from "./support/findingFakes";
import { shop } from "./support/tryoutFakes";

let clock = fromSast(2026, 10, 26, 8, 0);
const sipho = { uid: "sipho", demo: false };
const thaboViewer = { uid: "thabo", demo: false };
const ANSWERS = { onTime: true, didTheWork: true, wouldHireAgain: true };

const refusal = async (call: Promise<unknown>) => {
  const error = await call.then(() => null, (caught: unknown) => caught);
  expect(error).toBeInstanceOf(AppError);
  return error as AppError;
};

/** Sipho's tryout tomorrow 09:00 to 15:00, offered to Thabo and accepted: booking-1. */
async function booked() {
  clock = fromSast(2026, 10, 26, 8, 0);
  const fakes = createBookingFakes(() => clock);
  fakes.store.users.set("sipho", { role: "business", status: "active" });
  fakes.store.businesses.set("sipho", { ...shop, ownerId: "sipho", name: "Sipho's Phone Repairs", area: "Randburg" });
  fakes.store.ledgers.set("sipho", [{ kind: "grant", amount: 3, reason: "welcome" }]);
  fakes.store.users.set("thabo", thabo);
  const window = { startAt: fromSast(2026, 10, 27, 9, 0), endAt: fromSast(2026, 10, 27, 15, 0) };
  fakes.tryouts.set("t1", tryoutAt(-26.0939, 28.0071, { ...window, area: "Randburg" }));
  fakes.applications.set(applicationId("t1", "thabo"), { tryoutId: "t1", workerId: "thabo", ownerId: "sipho", note: "", status: "applied", demo: false, ...window });
  await fakes.offerService.offer(sipho, "t1", "thabo");
  await fakes.offerService.answer(thaboViewer, "t1", "accept");
  const code = fakes.secrets.get("booking-1")?.checkInCode ?? "";
  return { ...fakes, code, door: { code, faceMatches: true, nameMatches: true, lastFourMatches: true } };
}

describe("a full tryout, from the door to Received", () => {
  it("checks in, checks out, uses the credit, records the payment, and confirms it", async () => {
    const { dayService, bookingService, bookings, store, tryouts, door, cases, secrets } = await booked();
    clock = fromSast(2026, 10, 27, 8, 55);
    expect(await dayService.checkIn(sipho, "booking-1", door)).toEqual({ status: "done" });
    expect(bookings.get("booking-1")).toMatchObject({ status: "checked_in", checkedInAt: clock });
    // The trusted contact's status page follows along.
    expect(await bookingService.status(secrets.get("booking-1")?.shareToken ?? "")).toMatchObject({ status: "checked_in" });

    clock = fromSast(2026, 10, 27, 15, 0);
    expect(await dayService.checkOut(sipho, "booking-1", "completed", ANSWERS)).toEqual({ status: "done" });
    expect(bookings.get("booking-1")).toMatchObject({ status: "ended", owedCents: 21000, payment: { state: "awaiting_payment" } });
    expect(store.ledgers.get("sipho")?.at(-1)).toEqual({ kind: "use", tryoutId: "t1" });
    expect(tryouts.get("t1")?.status).toBe("completed");
    expect(store.users.get("thabo")).toMatchObject({ completed: 1, onTime: 1 });
    expect(store.businesses.get("sipho")?.completed).toBe(1);

    expect(await refusal(dayService.markPaid(sipho, "booking-1", { method: "ewallet", amountCents: 20000 }))).toMatchObject({ publicMessage: MARK_PAID_MESSAGES.below_minimum });
    // Thabo chose FNB eWallet and cash: the owner sees only those, and PayShap is refused.
    expect((await bookingService.view(sipho, "booking-1")).day.payMethods).toEqual(["ewallet", "cash"]);
    expect(await refusal(dayService.markPaid(sipho, "booking-1", { method: "payshap", amountCents: 21000 }))).toMatchObject({ publicMessage: MARK_PAID_MESSAGES.method_not_offered });
    expect(await dayService.markPaid(sipho, "booking-1", { method: "ewallet", amountCents: 21000, reference: "FS 27 OCT" })).toEqual({ status: "done" });
    expect((await bookingService.view(thaboViewer, "booking-1")).day.payment).toEqual({ state: "awaiting_confirmation", method: "ewallet", amountCents: 21000, reference: "FS 27 OCT" });
    expect(await dayService.confirm(thaboViewer, "booking-1", true)).toEqual({ status: "done" });
    expect(bookings.get("booking-1")?.payment?.state).toBe("received");
    // Marked paid the same afternoon and confirmed: one payment on the business's record, on time.
    expect(store.businesses.get("sipho")).toMatchObject({ payments: 1, paidOnTime: 1 });
    expect(cases).toEqual([]);
  });

  it("counts wrong check-in codes and locks after five", async () => {
    const { dayService, door, secrets } = await booked();
    clock = fromSast(2026, 10, 27, 9, 0);
    const wrong = door.code === "000000" ? "111111" : "000000";
    for (let i = 0; i < 5; i += 1) expect(await refusal(dayService.checkIn(sipho, "booking-1", { ...door, code: wrong }))).toMatchObject({ publicMessage: CHECK_IN_MESSAGES.wrong_code });
    expect(secrets.get("booking-1")?.codeAttempts).toBe(5);
    expect(await refusal(dayService.checkIn(sipho, "booking-1", door))).toMatchObject({ publicMessage: CHECK_IN_MESSAGES.locked });
  });

  it("records a no-show: the credit back, a strike for the young person, and a review", async () => {
    const { dayService, store, strikes, cases } = await booked();
    clock = fromSast(2026, 10, 27, 9, 30);
    expect(await dayService.noShow(sipho, "booking-1")).toEqual({ status: "done" });
    expect(store.ledgers.get("sipho")?.at(-1)).toEqual({ kind: "release", tryoutId: "t1" });
    expect(strikes).toEqual([{ uid: "thabo", reason: "no_show" }]);
    expect(cases).toMatchObject([{ kind: "booking_review", reason: "no_show_marked" }]);
  });

  it("sends 'the business wasn't open' to review without settling anything yet", async () => {
    const { dayService, cases, store } = await booked();
    clock = fromSast(2026, 10, 27, 9, 20);
    expect(await dayService.businessNotOpen(thaboViewer, "booking-1")).toEqual({ status: "done" });
    expect(cases).toMatchObject([{ reason: "business_not_open" }]);
    expect(store.ledgers.get("sipho")?.at(-1)).toEqual({ kind: "hold", tryoutId: "t1" });
  });

  it("pauses an unpaid business at 00:00, lifts it when it pays, and pauses it again on Not received", async () => {
    const { dayService, store, door, cases } = await booked();
    clock = fromSast(2026, 10, 27, 9, 0);
    await dayService.checkIn(sipho, "booking-1", door);
    clock = fromSast(2026, 10, 27, 15, 0);
    await dayService.checkOut(sipho, "booking-1", "completed", ANSWERS);
    clock = fromSast(2026, 10, 28, 0, 1);
    await dayService.sweepDeadlines(thaboViewer);
    expect(store.businesses.get("sipho")).toMatchObject({ status: "paused", pausedFor: "unpaid:booking-1" });
    // The pause counts it once as paid late.
    expect(store.businesses.get("sipho")).toMatchObject({ payments: 1 });
    expect(store.businesses.get("sipho")?.paidOnTime).toBeUndefined();
    await dayService.markPaid(sipho, "booking-1", { method: "cash", amountCents: 21000 });
    expect(store.businesses.get("sipho")).toMatchObject({ status: "active", pausedFor: null });
    await dayService.confirm(thaboViewer, "booking-1", false);
    expect(store.businesses.get("sipho")?.status).toBe("paused");
    expect(store.businesses.get("sipho")).toMatchObject({ payments: 1 });
    expect(cases).toMatchObject([{ reason: "not_received" }]);
  });

  it("reminds the young person a day after Paid with no answer", async () => {
    const { dayService, door } = await booked();
    clock = fromSast(2026, 10, 27, 9, 0);
    await dayService.checkIn(sipho, "booking-1", door);
    clock = fromSast(2026, 10, 27, 15, 0);
    await dayService.checkOut(sipho, "booking-1", "completed", ANSWERS);
    await dayService.markPaid(sipho, "booking-1", { method: "ewallet", amountCents: 21000 });
    clock = fromSast(2026, 10, 28, 15, 1);
    expect(await dayService.sweepDeadlines(thaboViewer)).toEqual(["booking-1"]);
  });
});

describe("Skip to the day, through the services", () => {
  const demoSipho = { uid: "sipho", demo: true };
  const demoThabo = { uid: "thabo", demo: true };
  const START = fromSast(2026, 10, 27, 9, 0);
  const END = fromSast(2026, 10, 27, 15, 0);

  /** The same booking as a demo one, the evening before, as a judge would find it. */
  async function demoBooked() {
    const fakes = await booked();
    const record = fakes.bookings.get("booking-1");
    if (record) fakes.bookings.set("booking-1", { ...record, demo: true });
    clock = fromSast(2026, 10, 26, 21, 30);
    return fakes;
  }

  it("opens the door the night before and keeps the daytime times, then walks the day to Received", async () => {
    const { bookingService, dayService, bookings, store, door, audit } = await demoBooked();
    expect(await bookingService.skipToDay(demoThabo, "booking-1")).toEqual({ status: "skipped" });
    expect(bookings.get("booking-1")).toMatchObject({ startAt: START, endAt: END, dayOpenedAt: clock, status: "booked" });
    expect(audit.at(-1)).toBe("demo_skipped_to_day");
    const view = await bookingService.view(demoSipho, "booking-1");
    expect(view).toMatchObject({ startAt: START.toISOString(), endAt: END.toISOString(), day: { canCheckIn: true, canSkipToDay: false } });
    // Once open, a second tap changes nothing.
    expect(await bookingService.skipToDay(demoSipho, "booking-1")).toEqual({ status: "unchanged" });

    expect(await dayService.checkIn(demoSipho, "booking-1", door)).toEqual({ status: "done" });
    clock = fromSast(2026, 10, 26, 21, 45);
    expect(await dayService.checkOut(demoSipho, "booking-1", "completed", ANSWERS)).toEqual({ status: "done" });
    expect(bookings.get("booking-1")).toMatchObject({ status: "ended", owedCents: 21000, startAt: START, endAt: END });
    // Checked in before the start: on time.
    expect(store.users.get("thabo")).toMatchObject({ completed: 1, onTime: 1 });
    // Due by 23:59 on the tryout's own day, not the evening it was opened.
    clock = fromSast(2026, 10, 27, 0, 1);
    await dayService.sweepDeadlines(demoThabo);
    expect(store.businesses.get("sipho")?.status).toBe("active");
    expect(await dayService.markPaid(demoSipho, "booking-1", { method: "ewallet", amountCents: 21000 })).toEqual({ status: "done" });
    expect(await dayService.confirm(demoThabo, "booking-1", true)).toEqual({ status: "done" });
    expect(store.businesses.get("sipho")).toMatchObject({ payments: 1, paidOnTime: 1 });
  });

  it("refuses a real booking at the same hour exactly as before, and never opens it", async () => {
    const { bookingService, dayService, bookings, door } = await booked();
    clock = fromSast(2026, 10, 26, 21, 30);
    expect(await refusal(dayService.checkIn(sipho, "booking-1", door))).toMatchObject({ publicMessage: CHECK_IN_MESSAGES.too_early });
    expect(await refusal(bookingService.skipToDay(sipho, "booking-1"))).toMatchObject({ status: 403, code: "not_demo" });
    expect(await refusal(bookingService.skipToDay(demoSipho, "booking-1"))).toMatchObject({ status: 403, code: "not_demo" });
    expect(bookings.get("booking-1")).toMatchObject({ startAt: START, endAt: END });
    expect(bookings.get("booking-1")?.dayOpenedAt).toBeUndefined();
  });

  it("refuses a demo booking to a viewer who is not demo", async () => {
    const { bookingService, bookings } = await demoBooked();
    expect(await refusal(bookingService.skipToDay(thaboViewer, "booking-1"))).toMatchObject({ status: 403, code: "not_demo" });
    expect(bookings.get("booking-1")?.dayOpenedAt).toBeUndefined();
  });

  it("keeps the door shut on a booking with the field set but no demo mark", async () => {
    const { dayService, bookings, door } = await booked();
    const record = bookings.get("booking-1");
    if (record) bookings.set("booking-1", { ...record, dayOpenedAt: fromSast(2026, 10, 26, 21, 0) });
    clock = fromSast(2026, 10, 26, 21, 30);
    expect(await refusal(dayService.checkIn(sipho, "booking-1", door))).toMatchObject({ publicMessage: CHECK_IN_MESSAGES.too_early });
  });
});

// A real PNG's first bytes, then padding: what the server reads to tell what a file is.
const PNG = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, ...new Array(64).fill(0)]);

describe("proof, only after Not received", () => {
  async function disputed() {
    const fakes = await booked();
    clock = fromSast(2026, 10, 27, 9, 0);
    await fakes.dayService.checkIn(sipho, "booking-1", fakes.door);
    clock = fromSast(2026, 10, 27, 15, 0);
    await fakes.dayService.checkOut(sipho, "booking-1", "completed", ANSWERS);
    return fakes;
  }

  it("is refused before Not received, so it's never part of the normal flow", async () => {
    const { dayService, files } = await disputed();
    await dayService.markPaid(sipho, "booking-1", { method: "ewallet", amountCents: 21000 });
    expect(await refusal(dayService.addEvidence(thaboViewer, "booking-1", PNG, ""))).toMatchObject({ code: "not_disputed" });
    expect(files.size).toBe(0);
  });

  it("takes one screenshot and note from each side, at a private path, and no more", async () => {
    const { dayService, bookingService, evidence, files, audit } = await disputed();
    await dayService.markPaid(sipho, "booking-1", { method: "ewallet", amountCents: 21000 });
    await dayService.confirm(thaboViewer, "booking-1", false);
    expect((await bookingService.view(thaboViewer, "booking-1")).day.evidence).toEqual({ canAdd: true, sent: false });
    expect(await dayService.addEvidence(thaboViewer, "booking-1", PNG, "  My balance after 18:00  ")).toEqual({ status: "done" });
    expect(await dayService.addEvidence(sipho, "booking-1", PNG, "")).toEqual({ status: "done" });
    expect(evidence).toMatchObject([
      { bookingId: "booking-1", party: "young_person", contentType: "image/png", note: "My balance after 18:00" },
      { party: "business" },
    ]);
    expect([...files.keys()].every((path) => path.startsWith("evidence/booking-1/"))).toBe(true);
    expect(audit.filter((action) => action === "evidence_added")).toHaveLength(2);
    expect((await bookingService.view(thaboViewer, "booking-1")).day.evidence).toEqual({ canAdd: false, sent: true });
    expect(await refusal(dayService.addEvidence(thaboViewer, "booking-1", PNG, ""))).toMatchObject({ code: "already_added" });
    expect(files.size).toBe(2);
  });

  it("refuses anything that isn't an image, and someone else's booking reads as not found", async () => {
    const { dayService, files } = await disputed();
    await dayService.markPaid(sipho, "booking-1", { method: "ewallet", amountCents: 21000 });
    await dayService.confirm(thaboViewer, "booking-1", false);
    expect(await refusal(dayService.addEvidence(thaboViewer, "booking-1", new TextEncoder().encode("<script>alert(1)</script>"), ""))).toMatchObject({ code: "not_an_image" });
    expect(await refusal(dayService.addEvidence({ uid: "lerato", demo: false }, "booking-1", PNG, ""))).toMatchObject({ status: 404 });
    expect(files.size).toBe(0);
  });
});
