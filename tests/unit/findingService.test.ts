import { describe, expect, it } from "vitest";
import { RULES } from "@/config/rules";
import { CLOSED_MESSAGES, FINDING_MESSAGES, NOT_ELIGIBLE_MESSAGES } from "@/domain/findingMessages";
import { AppError } from "@/server/errors";
import { createFindingFakes, thabo, tryoutAt } from "./support/findingFakes";

const real = { uid: "thabo", demo: false };
const demoThabo = { uid: "demo-thabo", demo: true };
const MIDRAND: [number, number] = [-25.9992, 28.1263];

const refusal = async (call: Promise<unknown>) => {
  const error = await call.then(() => null, (caught: unknown) => caught);
  expect(error).toBeInstanceOf(AppError);
  return error as AppError;
};

function withTryouts() {
  const fakes = createFindingFakes();
  fakes.tryouts.set("real-1", tryoutAt(...MIDRAND));
  fakes.tryouts.set("demo-1", tryoutAt(...MIDRAND, { demo: true, ownerId: "demo-sipho" }));
  fakes.store.users.set("demo-thabo", { ...thabo, demo: true });
  fakes.businesses.set("sipho", { completed: 3, coida: "registered" });
  return fakes;
}

describe("nearby", () => {
  it("shows a real young person only real tryouts, and a demo one only demo tryouts", async () => {
    const { service } = withTryouts();
    expect(await service.nearby(real)).toMatchObject({ status: "ok", area: "Ivory Park", items: [{ id: "real-1", isNew: false, injuryCover: "Injury cover: confirmed by the business" }] });
    expect(await service.nearby(demoThabo)).toMatchObject({ status: "ok", items: [{ id: "demo-1", isNew: true }] });
  });

  it("says so when the young person's area has no map point, without querying", async () => {
    const fakes = withTryouts();
    fakes.store.users.set("thabo", { ...thabo, area: "Soshanguve" });
    expect(await fakes.service.nearby(real)).toEqual({ status: "unknown_area", area: "Soshanguve" });
    expect(fakes.rangeQueries()).toBe(0);
  });

  it("is for young people only", async () => {
    const fakes = withTryouts();
    fakes.store.users.set("sipho", { role: "business", status: "active" });
    expect(await refusal(fakes.service.nearby({ uid: "sipho", demo: false }))).toMatchObject({ status: 403, publicMessage: NOT_ELIGIBLE_MESSAGES.not_young_person });
  });
});

describe("detail", () => {
  it("gives the slip, the tasks and the young person's state", async () => {
    const { service } = withTryouts();
    expect(await service.detail(real, "real-1")).toMatchObject({ item: { id: "real-1", returnFareCents: 3600 }, tasks: ["Greet customers"], state: { kind: "can_apply" } });
  });

  it("treats a tryout from the other world exactly like one that doesn't exist", async () => {
    const { service } = withTryouts();
    for (const [viewer, id] of [[real, "demo-1"], [demoThabo, "real-1"], [real, "no-such-tryout"]] as const) {
      expect(await refusal(service.detail(viewer, id))).toMatchObject({ status: 404, publicMessage: FINDING_MESSAGES.notFound });
    }
  });
});

describe("apply and withdraw", () => {
  it("applies once, with one audit entry and one applicant counted; a second tap changes nothing", async () => {
    const { service, applications, applicants, audit, quota } = withTryouts();
    expect(await service.apply(real, "real-1", " I can be there by 8:30 ")).toEqual({ status: "applied", state: { kind: "applied" } });
    expect(await service.apply(real, "real-1", "again")).toEqual({ status: "unchanged", state: { kind: "applied" } });
    expect(applications.get("real-1_thabo")).toMatchObject({ note: "I can be there by 8:30", ownerId: "sipho", demo: false });
    expect(applicants.get("real-1")).toBe(1);
    expect(audit).toEqual([{ uid: "thabo", action: "application_made", target: "real-1_thabo" }]);
    expect(quota.get("thabo_applications")).toBe(1);
  });

  it("never lets a demo account apply to a real tryout, or a real person to a demo one, and writes nothing", async () => {
    const { service, applications, audit, quota } = withTryouts();
    expect(await refusal(service.apply(demoThabo, "real-1", ""))).toMatchObject({ status: 404 });
    expect(await refusal(service.apply(real, "demo-1", ""))).toMatchObject({ status: 404 });
    expect(applications.size + audit.length + quota.size).toBe(0);
  });

  it("refuses a closed tryout and an overlap with a booking before spending the daily limit", async () => {
    const fakes = withTryouts();
    fakes.tryouts.set("withdrawn", tryoutAt(...MIDRAND, { status: "withdrawn" }));
    expect(await refusal(fakes.service.apply(real, "withdrawn", ""))).toMatchObject({ status: 409, publicMessage: CLOSED_MESSAGES.not_open });
    fakes.bookings.set("thabo", [{ start: new Date("2026-10-27T08:00:00Z"), end: new Date("2026-10-27T12:00:00Z") }]);
    expect(await refusal(fakes.service.apply(real, "real-1", ""))).toMatchObject({ status: 409, publicMessage: NOT_ELIGIBLE_MESSAGES.overlaps_booking });
    expect(fakes.quota.size + fakes.applications.size).toBe(0);
  });

  it(`stops at ${RULES.applicationsPerDay} applications a day`, async () => {
    const fakes = withTryouts();
    for (let i = 0; i <= RULES.applicationsPerDay; i += 1) fakes.tryouts.set(`t${i}`, tryoutAt(...MIDRAND));
    for (let i = 0; i < RULES.applicationsPerDay; i += 1) await fakes.service.apply(real, `t${i}`, "");
    expect(await refusal(fakes.service.apply(real, `t${RULES.applicationsPerDay}`, ""))).toMatchObject({ status: 429, publicMessage: FINDING_MESSAGES.applyLimit });
    expect(fakes.applications.size).toBe(RULES.applicationsPerDay);
  });

  it("withdraws, counts the applicant off, lets them apply again, and treats someone else's as not found", async () => {
    const { service, applicants, audit } = withTryouts();
    await service.apply(real, "real-1", "");
    expect(await service.withdraw(real, "real-1")).toEqual({ status: "withdrawn", state: { kind: "can_apply" } });
    expect(await service.withdraw(real, "real-1")).toEqual({ status: "unchanged", state: { kind: "can_apply" } });
    expect(applicants.get("real-1")).toBe(0);
    expect(await service.apply(real, "real-1", "")).toMatchObject({ status: "applied" });
    expect(audit.map((entry) => entry.action)).toEqual(["application_made", "application_withdrawn", "application_made"]);
    expect(await refusal(service.withdraw({ uid: "lerato", demo: false }, "real-1"))).toMatchObject({ status: 404, publicMessage: FINDING_MESSAGES.applicationNotFound });
  });
});
