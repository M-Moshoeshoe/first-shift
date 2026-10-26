import { describe, expect, it } from "vitest";
import { applicationId, type ApplicationRecord } from "@/domain/applications";
import { ANSWER_PROBLEM_MESSAGES, BOOKING_COPY, OFFER_PROBLEM_MESSAGES } from "@/domain/bookingMessages";
import { fromSast } from "@/domain/time";
import { AppError } from "@/server/errors";
import { createBookingFakes } from "./support/bookingFakes";
import { thabo, tryoutAt } from "./support/findingFakes";
import { shop } from "./support/tryoutFakes";

let clock = fromSast(2026, 10, 26, 8, 0);
const sipho = { uid: "sipho", demo: false };
const thaboViewer = { uid: "thabo", demo: false };
const lerato = { uid: "lerato", demo: false };

const refusal = async (call: Promise<unknown>) => {
  const error = await call.then(() => null, (caught: unknown) => caught);
  expect(error).toBeInstanceOf(AppError);
  return error as AppError;
};

const app = (tryoutId: string, workerId: string, overrides: Partial<ApplicationRecord> = {}): ApplicationRecord => ({
  tryoutId, workerId, ownerId: "sipho", note: "Can start early", status: "applied", demo: false, seenByOwner: false,
  startAt: fromSast(2026, 10, 27, 9, 0), endAt: fromSast(2026, 10, 27, 15, 0), ...overrides,
});

/** Sipho's tryout t1 tomorrow, with Thabo and Lerato applied; Thabo also applied to Ayanda's t2 at the same time. */
function setUp() {
  clock = fromSast(2026, 10, 26, 8, 0);
  const fakes = createBookingFakes(() => clock);
  fakes.store.users.set("sipho", { role: "business", status: "active" });
  fakes.store.businesses.set("sipho", { ...shop, ownerId: "sipho", name: "Sipho's Phone Repairs", area: "Randburg" });
  fakes.store.ledgers.set("sipho", [{ kind: "grant", amount: 3, reason: "welcome" }]);
  fakes.store.users.set("thabo", thabo);
  fakes.store.users.set("lerato", { ...thabo, firstName: "Lerato" });
  const window = { startAt: fromSast(2026, 10, 27, 9, 0), endAt: fromSast(2026, 10, 27, 15, 0) };
  fakes.tryouts.set("t1", tryoutAt(-26.0939, 28.0071, { ...window, area: "Randburg" }));
  fakes.tryouts.set("t2", tryoutAt(-25.9861, 28.1958, { ...window, ownerId: "ayanda" }));
  fakes.applications.set(applicationId("t1", "thabo"), app("t1", "thabo"));
  fakes.applications.set(applicationId("t1", "lerato"), app("t1", "lerato"));
  fakes.applications.set(applicationId("t2", "thabo"), app("t2", "thabo", { ownerId: "ayanda" }));
  return fakes;
}

describe("the owner's tryout page", () => {
  it("ranks the applicants, and is the owner's alone", async () => {
    const { offerService } = setUp();
    const page = await offerService.ownerTryout(sipho, "t1");
    expect(page.applicants.map((applicant) => applicant.firstName).sort()).toEqual(["Lerato", "Thabo"]);
    expect(page.applicants[0]).toMatchObject({ note: "Can start early", returnFareCents: 5600, showUp: { band: "new" } });
    expect(await refusal(offerService.ownerTryout(lerato, "t1"))).toMatchObject({ status: 404 });
  });

  it("counts new applicants on the owner's badge until they're seen", async () => {
    const { offerService } = setUp();
    expect(await offerService.badges(sipho)).toEqual({ count: 2 });
    await offerService.markSeen(sipho, "t1");
    expect(await offerService.badges(sipho)).toEqual({ count: 0 });
  });

  it("leaves out applicants to a tryout that's no longer taking bookings", async () => {
    const { offerService, tryouts } = setUp();
    const t1 = tryouts.get("t1");
    if (t1) tryouts.set("t1", { ...t1, status: "withdrawn" });
    expect(await offerService.badges(sipho)).toEqual({ count: 0 });
  });
});

describe("offer, then accept or decline", () => {
  it("offers to one applicant at a time; a decline frees the tryout for someone else", async () => {
    const { offerService, applications } = setUp();
    expect(await offerService.offer(sipho, "t1", "thabo")).toEqual({ status: "offered" });
    expect(await offerService.badges(thaboViewer)).toEqual({ count: 1 });
    expect(await refusal(offerService.offer(sipho, "t1", "lerato"))).toMatchObject({ status: 409, publicMessage: OFFER_PROBLEM_MESSAGES.offer_pending });
    expect(await offerService.answer(thaboViewer, "t1", "decline")).toMatchObject({ status: "declined" });
    expect(applications.get("t1_thabo")?.status).toBe("declined");
    expect(await offerService.offer(sipho, "t1", "lerato")).toEqual({ status: "offered" });
  });

  it("accepting books it: the credit is held, everyone else is not selected, and overlapping applications are withdrawn", async () => {
    const { offerService, applications, bookings, tryouts, store, secrets } = setUp();
    await offerService.offer(sipho, "t1", "thabo");
    expect(await offerService.answer(thaboViewer, "t1", "accept")).toEqual({ status: "booked", state: { kind: "booked", bookingId: "booking-1" } });
    expect(tryouts.get("t1")).toMatchObject({ status: "booked", bookingId: "booking-1", offer: null });
    expect([applications.get("t1_thabo")?.status, applications.get("t1_lerato")?.status, applications.get("t2_thabo")?.status]).toEqual(["booked", "not_selected", "withdrawn"]);
    expect(store.ledgers.get("sipho")?.at(-1)).toEqual({ kind: "hold", tryoutId: "t1" });
    expect(bookings.get("booking-1")).toMatchObject({ workerId: "thabo", ownerId: "sipho", workerPayoutPhone: "27821234567", status: "booked" });
    expect(secrets.get("booking-1")?.checkInCode).toMatch(/^\d{6}$/);
    expect(await offerService.answer(thaboViewer, "t1", "accept")).toMatchObject({ status: "unchanged" });
  });

  it("refuses to accept without a credit to hold, and at the 24-hour line, writing nothing", async () => {
    const fakes = setUp();
    await fakes.offerService.offer(sipho, "t1", "thabo");
    fakes.store.ledgers.set("sipho", []);
    expect(await refusal(fakes.offerService.answer(thaboViewer, "t1", "accept"))).toMatchObject({ status: 409, code: "no_credits" });
    fakes.store.ledgers.set("sipho", [{ kind: "grant", amount: 3, reason: "welcome" }]);
    // Twenty hours with Sipho already this month: six more would cross the line.
    fakes.bookings.set("earlier", { ...(await bookedEarlier()), hours: 20 });
    expect(await refusal(fakes.offerService.answer(thaboViewer, "t1", "accept"))).toMatchObject({ code: "regular_employment", publicMessage: ANSWER_PROBLEM_MESSAGES.regular_employment });
    expect(fakes.tryouts.get("t1")?.status).toBe("published");
  });

  it("lets an offer lapse at the booking cut-off", async () => {
    const { offerService } = setUp();
    await offerService.offer(sipho, "t1", "thabo");
    clock = fromSast(2026, 10, 27, 8, 1);
    expect(await refusal(offerService.answer(thaboViewer, "t1", "accept"))).toMatchObject({ code: "lapsed" });
    expect((await offerService.applications(thaboViewer)).items.find((item) => item.tryoutId === "t1")?.status).toBe("offer_ended");
    expect(await offerService.badges(thaboViewer)).toEqual({ count: 0 });
  });
});

async function bookedEarlier() {
  const fakes = setUp();
  await fakes.offerService.offer(sipho, "t1", "thabo");
  await fakes.offerService.answer(thaboViewer, "t1", "accept");
  const booking = fakes.bookings.get("booking-1");
  if (!booking) throw new Error("fixture");
  return { ...booking, tryoutId: "earlier", startAt: fromSast(2026, 10, 5, 9, 0), endAt: fromSast(2026, 10, 5, 17, 0) };
}

async function booked() {
  const fakes = setUp();
  await fakes.offerService.offer(sipho, "t1", "thabo");
  await fakes.offerService.answer(thaboViewer, "t1", "accept");
  return fakes;
}

describe("the booking", () => {
  it("shows the owner the payout number and never the code; the young person the code and the share link", async () => {
    const { bookingService } = await booked();
    expect(await bookingService.view(sipho, "booking-1")).toMatchObject({ party: "business", payoutPhone: "082 123 4567", whatsappUrl: "https://wa.me/27821234567", checkInCode: null, shareToken: null, cancel: { kind: "free", owedCents: 0 } });
    const young = await bookingService.view(thaboViewer, "booking-1");
    // Once booked, the young person meets the owner: first name, face and WhatsApp, never the owner's legal name or ID.
    expect(young).toMatchObject({ party: "young_person", payoutPhone: null, whatsappUrl: "https://wa.me/27831234567", owner: { firstName: "Lerato", subject: "sipho" }, checkInCode: expect.stringMatching(/^\d{6}$/), photo: { subject: "sipho", kind: "shopfront" } });
    expect(JSON.stringify(young)).not.toMatch(/Mahlangu|legalName|idLastFour/);
    expect((await bookingService.view(sipho, "booking-1")).owner).toBeNull();
    // The exact pin from the business record, revealed only now that they are booked.
    expect(young.mapsUrl).toBe("https://www.google.com/maps/search/?api=1&query=-25.996341,28.227113");
    expect(await refusal(bookingService.view(lerato, "booking-1"))).toMatchObject({ status: 404, publicMessage: BOOKING_COPY.notFound });
  });

  it("cancels free: the credit comes back and nobody gets a strike", async () => {
    const { bookingService, store, strikes, tryouts, applications } = await booked();
    expect(await bookingService.cancel(thaboViewer, "booking-1")).toEqual({ status: "cancelled" });
    expect(store.ledgers.get("sipho")?.at(-1)).toEqual({ kind: "release", tryoutId: "t1" });
    expect(strikes).toEqual([]);
    expect([tryouts.get("t1")?.status, applications.get("t1_thabo")?.status]).toEqual(["withdrawn", "withdrawn"]);
    expect(await bookingService.cancel(thaboViewer, "booking-1")).toEqual({ status: "unchanged" });
  });

  it("cancels late by the business: 4 hours owed, the credit used, a strike for the business", async () => {
    const { bookingService, bookings, store, strikes } = await booked();
    clock = fromSast(2026, 10, 27, 7, 0);
    expect((await bookingService.view(sipho, "booking-1")).cancel).toEqual({ kind: "late", owedCents: 14000 });
    await bookingService.cancel(sipho, "booking-1");
    expect(bookings.get("booking-1")).toMatchObject({ status: "cancelled", owedCents: 14000, cancellation: { by: "business", kind: "late" } });
    expect(store.ledgers.get("sipho")?.at(-1)).toEqual({ kind: "use", tryoutId: "t1" });
    expect(strikes).toEqual([{ uid: "sipho", reason: "late_cancellation" }]);
  });

  it("can't be cancelled once it has started", async () => {
    const { bookingService } = await booked();
    clock = fromSast(2026, 10, 27, 9, 5);
    expect(await refusal(bookingService.cancel(thaboViewer, "booking-1"))).toMatchObject({ status: 409, publicMessage: BOOKING_COPY.started });
  });

  it("takes a report, and pauses the business at once for harassment from the young person", async () => {
    const { bookingService, cases, store } = await booked();
    expect(await bookingService.report(thaboViewer, "booking-1", "harassment", "He shouted at me")).toEqual({ paused: true });
    expect(cases).toHaveLength(1);
    expect(store.businesses.get("sipho")?.status).toBe("paused");
    expect(await refusal(bookingService.report(lerato, "booking-1", "other", ""))).toMatchObject({ status: 404 });
  });

  it("serves the status page by token, until it expires, and nothing for a wrong token", async () => {
    const { bookingService, secrets } = await booked();
    const token = secrets.get("booking-1")?.shareToken ?? "";
    expect(await bookingService.status(token)).toMatchObject({ workerFirstName: "Thabo", businessName: "Sipho's Phone Repairs", status: "booked" });
    expect(await bookingService.status("share-token-99999999")).toBeNull();
    expect(await bookingService.status("../etc")).toBeNull();
    clock = fromSast(2026, 10, 28, 0, 0);
    expect(await bookingService.status(token)).toBeNull();
  });
});
