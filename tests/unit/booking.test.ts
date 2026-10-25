import { describe, expect, it } from "vitest";
import { rankApplicants } from "@/domain/applicantRanking";
import type { ApplicationRecord } from "@/domain/applications";
import { cancelOutcome, decideCancel, decideReport, mayViewPhoto, statusExpiresAt, statusView, type BookingRecord } from "@/domain/bookings";
import { BOOKING_MESSAGES } from "@/domain/tryoutMessages";
import { ANSWER_PROBLEM_MESSAGES } from "@/domain/bookingMessages";
import { decideAnswer, decideOffer, offerLapsesAt, openOffer, overlappingApplications, type AcceptInputs } from "@/domain/offers";
import { fromSast } from "@/domain/time";
import { thabo, tryoutAt } from "./support/findingFakes";

// Monday 26 October 2026, 08:00 SAST; the tryout is Tuesday 09:00 to 15:00.
const NOW = fromSast(2026, 10, 26, 8, 0);
const owner = { uid: "sipho", demo: false };
const worker = { uid: "thabo", demo: false };
const application = (overrides: Partial<ApplicationRecord> = {}): ApplicationRecord => ({
  tryoutId: "t1", workerId: "thabo", ownerId: "sipho", note: "", status: "applied", demo: false,
  startAt: fromSast(2026, 10, 27, 9, 0), endAt: fromSast(2026, 10, 27, 15, 0), ...overrides,
});
const tryout = (overrides: Parameters<typeof tryoutAt>[2] = {}) => tryoutAt(-26.0939, 28.0071, { startAt: fromSast(2026, 10, 27, 9, 0), endAt: fromSast(2026, 10, 27, 15, 0), ...overrides });
const offered = () => tryout({ offer: { workerId: "thabo", at: NOW } });
const WELCOME = [{ kind: "grant" as const, amount: 3, reason: "welcome" as const }];
const accept = (overrides: Partial<AcceptInputs> = {}): AcceptInputs => ({ tryout: offered(), application: application({ status: "offered" }), ownerLedger: WELCOME, workerBookings: [], pairSlots: [], now: NOW, ...overrides });

describe("offers", () => {
  it("lapse at the booking cut-off, an hour before the start", () => {
    expect(offerLapsesAt(tryout())).toEqual(fromSast(2026, 10, 27, 8, 0));
    expect(openOffer(offered(), fromSast(2026, 10, 27, 8, 0))).not.toBeNull();
    expect(openOffer(offered(), fromSast(2026, 10, 27, 8, 1))).toBeNull();
  });

  it("go one at a time, to someone who applied, on the owner's own open tryout", () => {
    expect(decideOffer(owner, tryout(), application(), NOW)).toEqual({ kind: "offer" });
    expect(decideOffer(owner, offered(), application({ workerId: "lerato" }), NOW)).toEqual({ kind: "refuse", problem: "offer_pending" });
    expect(decideOffer(owner, offered(), application({ status: "offered" }), NOW)).toEqual({ kind: "unchanged" });
    expect(decideOffer({ uid: "lerato", demo: false }, tryout(), application(), NOW)).toEqual({ kind: "refuse", problem: "not_found" });
    expect(decideOffer(owner, tryout(), application({ status: "withdrawn" }), NOW)).toEqual({ kind: "refuse", problem: "not_applicant" });
    expect(decideOffer(owner, tryout(), application(), fromSast(2026, 10, 27, 8, 30))).toEqual({ kind: "refuse", problem: "not_open" });
  });

  it("can be offered to someone else once the last one is declined", () => {
    expect(decideOffer(owner, tryout({ offer: null }), application({ workerId: "lerato" }), NOW)).toEqual({ kind: "offer" });
  });
});

describe("accepting", () => {
  it("books and holds one credit when every rule passes", () => {
    expect(decideAnswer(worker, accept(), "accept")).toEqual({ kind: "accept", hold: [{ kind: "hold", tryoutId: "t1" }] });
    expect(decideAnswer(worker, accept(), "decline")).toEqual({ kind: "decline" });
  });

  it("refuses at the 24-hour line, with its approved message", () => {
    // 2 x 8 hours already with Sipho in October; this 6-hour tryout would make 22: allowed. 3 x 8 would make 30: refused.
    expect(decideAnswer(worker, accept({ pairSlots: [{ startAt: fromSast(2026, 10, 5, 9, 0), hours: 8 }, { startAt: fromSast(2026, 10, 12, 9, 0), hours: 8 }] }), "accept").kind).toBe("accept");
    const crossing = accept({ pairSlots: [{ startAt: fromSast(2026, 10, 5, 9, 0), hours: 8 }, { startAt: fromSast(2026, 10, 12, 9, 0), hours: 8 }, { startAt: fromSast(2026, 10, 19, 9, 0), hours: 4 }] });
    expect(decideAnswer(worker, crossing, "accept")).toEqual({ kind: "refuse", problem: "regular_employment" });
    expect(ANSWER_PROBLEM_MESSAGES.regular_employment).toBe(BOOKING_MESSAGES.regularEmployment);
    // Last month's hours don't count.
    expect(decideAnswer(worker, accept({ pairSlots: [{ startAt: fromSast(2026, 9, 28, 9, 0), hours: 20 }] }), "accept").kind).toBe("accept");
  });

  it("refuses with no credit to hold, an overlap, a lapsed offer, or someone else's offer", () => {
    expect(decideAnswer(worker, accept({ ownerLedger: [] }), "accept")).toEqual({ kind: "refuse", problem: "no_credits" });
    expect(decideAnswer(worker, accept({ workerBookings: [{ start: fromSast(2026, 10, 27, 14, 0), end: fromSast(2026, 10, 27, 18, 0) }] }), "accept")).toEqual({ kind: "refuse", problem: "overlaps_booking" });
    expect(decideAnswer(worker, accept({ now: fromSast(2026, 10, 27, 8, 30) }), "accept")).toEqual({ kind: "refuse", problem: "lapsed" });
    expect(decideAnswer({ uid: "lerato", demo: false }, accept(), "accept")).toEqual({ kind: "refuse", problem: "not_found" });
    expect(decideAnswer(worker, accept({ tryout: tryout({ offer: { workerId: "lerato", at: NOW } }) }), "accept")).toEqual({ kind: "refuse", problem: "no_offer" });
  });

  it("is idempotent once booked or declined", () => {
    expect(decideAnswer(worker, accept({ application: application({ status: "booked" }) }), "accept")).toEqual({ kind: "unchanged" });
    expect(decideAnswer(worker, accept({ application: application({ status: "declined" }) }), "decline")).toEqual({ kind: "unchanged" });
  });

  it("withdraws the young person's other open applications that overlap, and only those", () => {
    const booked = { start: fromSast(2026, 10, 27, 9, 0), end: fromSast(2026, 10, 27, 15, 0) };
    const others = [
      application({ tryoutId: "same-day", startAt: fromSast(2026, 10, 27, 13, 0), endAt: fromSast(2026, 10, 27, 17, 0) }),
      application({ tryoutId: "offered-same-time", status: "offered" }),
      application({ tryoutId: "next-day", startAt: fromSast(2026, 10, 28, 9, 0), endAt: fromSast(2026, 10, 28, 15, 0) }),
      application({ tryoutId: "already-withdrawn", status: "withdrawn" }),
      application({ tryoutId: "t1", status: "offered" }),
    ];
    expect(overlappingApplications(others, booked, "t1").map((app) => app.tryoutId)).toEqual(["same-day", "offered-same-time"]);
  });
});

const booking = (overrides: Partial<BookingRecord> = {}): BookingRecord => ({
  tryoutId: "t1", ownerId: "sipho", workerId: "thabo", demo: false, title: "Phone shop helper", businessName: "Sipho's Phone Repairs", businessArea: "Randburg",
  location: { latitude: -26.0939, longitude: 28.0071, accuracyMetres: 15 }, workerFirstName: "Thabo", workerArea: "Ivory Park", workerPayoutPhone: "27821234567", workerIdLastFour: "0087",
  startAt: fromSast(2026, 10, 27, 9, 0), endAt: fromSast(2026, 10, 27, 15, 0), hours: 6, rateCentsPerHour: 3500, payCents: 21000, status: "booked",
  bookedAt: fromSast(2026, 10, 25, 18, 0), cancellation: null, owedCents: null, ...overrides,
});

describe("cancelling, settled through settle()", () => {
  it("is free more than 12 hours before the start: nothing owed, the credit returned, no strike", () => {
    expect(cancelOutcome("business", booking(), NOW, 0)).toEqual({ kind: "free", reliedOnGrace: false, settlement: { wage: null, credit: "release", strike: null } });
  });

  it("is late inside 12 hours: the business owes 4 hours and uses the credit; either side gets a strike", () => {
    const late = fromSast(2026, 10, 27, 7, 0);
    const business = cancelOutcome("business", booking(), late, 0);
    expect(business).toMatchObject({ kind: "late", settlement: { wage: { amountCents: 14000 }, credit: "use", strike: { party: "business", reason: "late_cancellation" } } });
    expect(cancelOutcome("young_person", booking(), late, 0)).toMatchObject({ kind: "late", settlement: { wage: null, credit: "release", strike: { party: "young_person" } } });
  });

  it("is free inside the 15-minute grace after booking, unless the grace has been used 3 times in 30 days", () => {
    const bookedLate = booking({ bookedAt: fromSast(2026, 10, 27, 6, 30) });
    expect(cancelOutcome("young_person", bookedLate, fromSast(2026, 10, 27, 6, 40), 0)).toMatchObject({ kind: "free", reliedOnGrace: true });
    expect(cancelOutcome("young_person", bookedLate, fromSast(2026, 10, 27, 6, 40), 3)).toMatchObject({ kind: "late" });
  });

  it("isn't possible after the start or for someone else, and twice changes nothing", () => {
    expect(decideCancel(worker, booking(), fromSast(2026, 10, 27, 9, 0), 0)).toEqual({ kind: "refuse", problem: "started" });
    expect(decideCancel({ uid: "lerato", demo: false }, booking(), NOW, 0)).toEqual({ kind: "refuse", problem: "not_found" });
    expect(decideCancel(worker, booking({ status: "cancelled" }), NOW, 0)).toEqual({ kind: "unchanged" });
    expect(decideCancel(owner, booking(), NOW, 0)).toMatchObject({ kind: "cancel", party: "business" });
  });
});

describe("reports", () => {
  it("pause the business at once only when the young person reports harassment or unsafe work", () => {
    expect(decideReport(worker, booking(), "t1", "harassment", "")).toMatchObject({ kind: "report", pauseBusiness: true, reviewCase: { kind: "report", businessId: "sipho", reporterId: "thabo", status: "open" } });
    expect(decideReport(worker, booking(), "t1", "unsafe_work", "")).toMatchObject({ pauseBusiness: true });
    expect(decideReport(worker, booking(), "t1", "not_paid", "")).toMatchObject({ pauseBusiness: false });
    expect(decideReport(owner, booking(), "t1", "harassment", "")).toMatchObject({ pauseBusiness: false });
    expect(decideReport({ uid: "lerato", demo: false }, booking(), "t1", "other", "")).toEqual({ kind: "refuse", problem: "not_found" });
  });
});

describe("the status page", () => {
  it("shows first names, the business, the times and the status, until midnight at the end of the tryout's day", () => {
    expect(statusExpiresAt(booking())).toEqual(fromSast(2026, 10, 28, 0, 0));
    const view = statusView(booking(), fromSast(2026, 10, 27, 23, 59));
    expect(view).toEqual({ workerFirstName: "Thabo", businessName: "Sipho's Phone Repairs", businessArea: "Randburg", startAt: expect.any(String), endAt: expect.any(String), status: "booked" });
    expect(JSON.stringify(view)).not.toMatch(/27821234567|-26\.09|sipho"|thabo"/);
    expect(statusView(booking(), fromSast(2026, 10, 28, 0, 0))).toBeNull();
  });
});

describe("photos", () => {
  it("are seen by their owner, an applicant's by the owner they applied to, and each other's once booked", () => {
    const none = { appliedToViewer: false, bookedTogether: false };
    expect(mayViewPhoto("thabo", "thabo", "profile", none)).toBe(true);
    expect(mayViewPhoto("sipho", "thabo", "profile", { ...none, appliedToViewer: true })).toBe(true);
    expect(mayViewPhoto("thabo", "sipho", "shopfront", { ...none, appliedToViewer: true })).toBe(false);
    expect(mayViewPhoto("thabo", "sipho", "shopfront", { ...none, bookedTogether: true })).toBe(true);
    expect(mayViewPhoto("lerato", "thabo", "profile", none)).toBe(false);
  });
});

describe("ranking applicants", () => {
  it("shows open applicants with show-up reasons, the fare and the first-timer place", () => {
    const veteran = (id: string) => ({ application: application({ workerId: id }), worker: { ...thabo, firstName: id, completed: 5, onTime: 5 }, approvedReferences: 2 });
    const inputs = [...["a", "b", "c", "d", "e"].map(veteran), { application: application({ workerId: "new" }), worker: { ...thabo, firstName: "Ayanda" }, approvedReferences: 0 }, { application: application({ workerId: "gone", status: "withdrawn" }), worker: thabo, approvedReferences: 0 }];
    const ranked = rankApplicants(tryout({ area: "Randburg", payCents: 21000 }), inputs);
    expect(ranked).toHaveLength(6);
    expect(ranked.filter((applicant) => applicant.shortlisted)).toHaveLength(5);
    expect(ranked.find((applicant) => applicant.workerId === "new")).toMatchObject({ firstTimerPlace: true, shortlisted: true, returnFareCents: 5600, distance: "about 21 km", showUp: { band: "new" } });
    expect(ranked[0]?.showUp.reasons[0]).toBe("On time for 5 of 5 tryouts");
  });
});
