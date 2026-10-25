import { describe, expect, it } from "vitest";
import { AREAS } from "@/config/areas";
import { RULES } from "@/config/rules";
import { applyState, bookingOpen, decideApply, decideWithdrawApplication, type ApplicationRecord } from "@/domain/applications";
import { areaCentre } from "@/domain/areas";
import { keepAfterFare } from "@/domain/fares";
import { aboutHowFar, distanceKm, nearbyFeed, searchBounds, type Listing } from "@/domain/nearby";
import { NOW, thabo, tryoutAt } from "./support/findingFakes";

const IVORY_PARK = { lat: -25.999, lng: 28.196 };
const from = { area: "Ivory Park", centre: IVORY_PARK };
const real = { uid: "thabo", demo: false };
const listing = (id: string, overrides: Parameters<typeof tryoutAt>[2] = {}, at: [number, number] = [-25.9992, 28.1263]): Listing => ({ id, tryout: tryoutAt(at[0], at[1], overrides), business: { completed: 0 } });

describe("areas as search points", () => {
  it("gives every known area a centre in Gauteng, and finds it by any spelling", () => {
    for (const area of AREAS) {
      expect(area.centre.lat).toBeGreaterThan(-26.5);
      expect(area.centre.lat).toBeLessThan(-25.5);
      expect(area.centre.lng).toBeGreaterThan(27.8);
      expect(area.centre.lng).toBeLessThan(28.5);
    }
    expect(areaCentre("ivory prk ext 2")).toEqual(IVORY_PARK);
    expect(areaCentre("Soshanguve")).toBeNull();
  });
});

describe("distance", () => {
  it("measures Ivory Park to Midrand as about 7 km, and says so plainly", () => {
    const km = distanceKm(IVORY_PARK, { lat: -25.9992, lng: 28.1263 });
    expect(km).toBeGreaterThan(6.5);
    expect(km).toBeLessThan(7.5);
    expect(aboutHowFar(km)).toBe("about 7 km");
    expect(aboutHowFar(0.4)).toBe("under 1 km");
    expect(aboutHowFar(3.5)).toBe("about 4 km");
  });

  it("covers the radius with geohash ranges", () => {
    const bounds = searchBounds(IVORY_PARK);
    expect(bounds.length).toBeGreaterThan(0);
    for (const [start, end] of bounds) expect(start <= end).toBe(true);
  });
});

describe("nearbyFeed", () => {
  it("keeps published tryouts within the radius that are open for booking, once each, soonest first", () => {
    const later = listing("later", { startAt: new Date("2026-10-28T07:00:00Z"), endAt: new Date("2026-10-28T13:00:00Z") });
    const items = nearbyFeed(real, from, [later, listing("soon"), listing("soon"), listing("far", {}, [-26.1, 28.233])], NOW);
    expect(items.map((item) => item.id)).toEqual(["soon", "later"]);
    expect(distanceKm(IVORY_PARK, { lat: -26.1, lng: 28.233 })).toBeGreaterThan(RULES.nearbyRadiusKm);
  });

  it("drops tryouts whose booking has closed, that aren't published, or that are from the other world", () => {
    const closing = listing("closing", { startAt: new Date("2026-10-26T06:59:00Z"), endAt: new Date("2026-10-26T12:59:00Z") });
    const items = nearbyFeed(real, from, [closing, listing("review", { status: "review" }), listing("demo", { demo: true }), listing("ok")], NOW);
    expect(items.map((item) => item.id)).toEqual(["ok"]);
    expect(nearbyFeed({ uid: "demo-thabo", demo: true }, from, [listing("demo", { demo: true }), listing("ok")], NOW).map((item) => item.id)).toEqual(["demo"]);
  });

  it("shows pay, the return fare, how far, the injury cover line and whether the business is new", () => {
    const [item] = nearbyFeed(real, from, [{ ...listing("t1"), business: { completed: 2, coida: "registered" } }], NOW);
    expect(item).toMatchObject({ payCents: 21000, returnFareCents: 3600, distance: "about 7 km", injuryCover: "Injury cover: confirmed by the business", isNew: false });
    const [unknownFare] = nearbyFeed(real, { area: "Tembisa", centre: IVORY_PARK }, [listing("t2")], NOW);
    expect(unknownFare).toMatchObject({ returnFareCents: null, injuryCover: "Injury cover: not confirmed", isNew: true });
  });

  it("never sends the business's pin, only the cell", () => {
    const json = JSON.stringify(nearbyFeed(real, from, [listing("t1")], NOW));
    expect(json).not.toContain("28.1263");
    expect(json).not.toContain("geohash");
  });
});

describe("pay after the fare", () => {
  it("takes the return fare off the day's pay, and says nothing when the fare isn't known", () => {
    expect(keepAfterFare(21000, 3600)).toBe(17400);
    expect(keepAfterFare(1000, 3600)).toBe(0);
    expect(keepAfterFare(21000, null)).toBeNull();
  });
});

describe("applying", () => {
  const tryout = tryoutAt(-25.9992, 28.1263);
  const inputs = { worker: thabo, tryout, application: null, bookings: [], now: NOW };
  const applied: ApplicationRecord = { tryoutId: "t1", workerId: "thabo", ownerId: "sipho", note: "", status: "applied", demo: false, startAt: tryout.startAt, endAt: tryout.endAt };

  it("closes bookings an hour before the start", () => {
    expect(bookingOpen(tryout, new Date("2026-10-27T06:00:00Z"))).toBe(true);
    expect(bookingOpen(tryout, new Date("2026-10-27T06:00:01Z"))).toBe(false);
    expect(bookingOpen({ ...tryout, status: "booked" }, NOW)).toBe(false);
  });

  it("lets a complete, active young person apply to an open tryout", () => {
    expect(applyState(inputs)).toEqual({ kind: "can_apply" });
  });

  it("says why someone can't apply, each with its own reason", () => {
    expect(applyState({ ...inputs, worker: { role: "business", status: "active" } })).toEqual({ kind: "not_eligible", reason: "not_young_person" });
    expect(applyState({ ...inputs, worker: { ...thabo, profilePhoto: undefined } })).toEqual({ kind: "not_eligible", reason: "profile_incomplete" });
    expect(applyState({ ...inputs, tryout: { ...tryout, status: "withdrawn" } })).toEqual({ kind: "closed", reason: "not_open" });
    expect(applyState({ ...inputs, now: new Date("2026-10-27T06:30:00Z") })).toEqual({ kind: "closed", reason: "booking_closed" });
    const overlapping = { start: new Date("2026-10-27T12:00:00Z"), end: new Date("2026-10-27T15:00:00Z") };
    expect(applyState({ ...inputs, bookings: [overlapping] })).toEqual({ kind: "not_eligible", reason: "overlaps_booking" });
    const touching = { start: tryout.endAt, end: new Date("2026-10-27T15:00:00Z") };
    expect(applyState({ ...inputs, bookings: [touching] })).toEqual({ kind: "can_apply" });
  });

  it("shows an application already made, even after booking closes", () => {
    expect(applyState({ ...inputs, application: applied, now: new Date("2026-10-27T06:30:00Z") })).toEqual({ kind: "applied" });
  });

  it("builds the application, marked like the viewer, with the note trimmed and capped", () => {
    const decision = decideApply(real, { ...inputs, tryoutId: "t1" }, `  ${"a".repeat(250)}  `);
    expect(decision).toMatchObject({ kind: "apply", record: { tryoutId: "t1", workerId: "thabo", ownerId: "sipho", status: "applied", demo: false } });
    if (decision.kind === "apply") expect(decision.record.note).toHaveLength(RULES.applicationNoteMaxChars);
  });

  it("treats a tryout from the other world as not found, and a second application as unchanged", () => {
    expect(decideApply({ uid: "thabo", demo: true }, { ...inputs, tryoutId: "t1" }, "")).toEqual({ kind: "refuse", problem: "not_found" });
    expect(decideApply(real, { ...inputs, tryoutId: "t1", tryout: null }, "")).toEqual({ kind: "refuse", problem: "not_found" });
    expect(decideApply(real, { ...inputs, tryoutId: "t1", application: applied }, "")).toEqual({ kind: "unchanged" });
  });

  it("lets only the applicant withdraw, and twice changes nothing", () => {
    expect(decideWithdrawApplication("thabo", applied)).toEqual({ kind: "withdraw" });
    expect(decideWithdrawApplication("thabo", { ...applied, status: "withdrawn" })).toEqual({ kind: "unchanged" });
    expect(decideWithdrawApplication("lerato", applied)).toEqual({ kind: "refuse", problem: "not_found" });
  });
});
