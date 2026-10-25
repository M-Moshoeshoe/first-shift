import { afterEach, describe, expect, it, vi } from "vitest";
import { RULES } from "@/config/rules";
import { POSTING_PROBLEM_MESSAGES, TERMS_MESSAGES, TRYOUT_MESSAGES } from "@/domain/tryoutMessages";
import { AppError } from "@/server/errors";
import { createTryoutFakes, fakeCheckWork, PIN, shop, terms } from "./support/tryoutFakes";

afterEach(() => vi.clearAllMocks());

const refusal = async (call: Promise<unknown>) => {
  const error = await call.then(() => null, (caught: unknown) => caught);
  expect(error).toBeInstanceOf(AppError);
  return error as AppError;
};

describe("draft", () => {
  it("drafts and checks side by side, suggests hours within 4 to 8, and writes nothing", async () => {
    const { service, tryouts, audit } = createTryoutFakes();
    const result = await service.draft("lerato", "Help sorting stock and serving customers on Saturday");
    expect(result).toEqual({ outcome: "allowed", draft: { title: "Shop helper", tasks: ["Pack bread onto the front shelves"], hours: RULES.maxTryoutHours } });
    expect(fakeCheckWork).toHaveBeenCalledWith("Request: Help sorting stock and serving customers on Saturday");
    expect(tryouts.size + audit.length).toBe(0);
  });

  it("answers a blocked request with the safer option and writes nothing", async () => {
    const { service, tryouts, audit } = createTryoutFakes();
    const result = await service.draft("lerato", "Fix the wiring in my shop");
    expect(result).toMatchObject({ outcome: "blocked", saferOption: expect.stringContaining("registered electrician") });
    expect(tryouts.size + audit.length).toBe(0);
  });

  it("refuses a business with no credit left before any AI is used, with the top-up message", async () => {
    const { service, store, quota } = createTryoutFakes();
    store.ledgers.set("lerato", []);
    expect(await refusal(service.draft("lerato", "Help sorting stock please"))).toMatchObject({ status: 409, code: "no_credits", publicMessage: POSTING_PROBLEM_MESSAGES.no_credits });
    expect(await refusal(service.post("lerato", terms()))).toMatchObject({ code: "no_credits" });
    expect(fakeCheckWork).not.toHaveBeenCalled();
    expect(quota.size).toBe(0);
  });

  it("refuses a young person and an unfinished business before any AI is used", async () => {
    const { service, store, quota } = createTryoutFakes();
    store.users.set("thabo", { role: "young_person", status: "active" });
    expect(await refusal(service.draft("thabo", "Help sorting stock please"))).toMatchObject({ status: 403, publicMessage: POSTING_PROBLEM_MESSAGES.not_business });
    store.businesses.set("lerato", { ...shop, shopfrontPhoto: undefined });
    expect(await refusal(service.draft("lerato", "Help sorting stock please"))).toMatchObject({ status: 409, publicMessage: POSTING_PROBLEM_MESSAGES.profile_incomplete });
    expect(quota.size).toBe(0);
  });
});

describe("post", () => {
  it("publishes allowed work with the business's details, the pay and an audit entry", async () => {
    const { service, tryouts, audit } = createTryoutFakes();
    expect(await service.post("lerato", terms())).toEqual({ outcome: "published", id: "tryout-1" });
    expect(tryouts.get("tryout-1")).toMatchObject({
      ownerId: "lerato",
      businessName: "Lerato's Spaza",
      area: "Tembisa",
      shopfrontPhoto: "photos/lerato/shopfront.jpg",
      status: "published",
      payCents: 18138,
      startAt: new Date("2026-10-27T07:00:00Z"),
      endAt: new Date("2026-10-27T13:00:00Z"),
    });
    expect(audit).toEqual([{ uid: "lerato", action: "tryout_posted", target: "tryout-1" }]);
  });

  it("never stores the exact pin, only the cell about 1 km across", async () => {
    const { service, tryouts } = createTryoutFakes();
    await service.post("lerato", terms());
    const stored = tryouts.get("tryout-1");
    expect(stored?.location.geohash).toHaveLength(6);
    const json = JSON.stringify(stored);
    for (const exact of [PIN.latitude, PIN.longitude]) expect(json).not.toContain(String(exact));
    expect(json).not.toContain("accuracyMetres");
  });

  it("catches tasks edited into blocked work at publish, and writes nothing", async () => {
    const { service, tryouts, audit } = createTryoutFakes();
    const result = await service.post("lerato", terms({ tasks: ["Pack bread onto the front shelves", "Rewire the DB board"] }));
    expect(result).toMatchObject({ outcome: "blocked" });
    expect(fakeCheckWork).toHaveBeenCalledWith(expect.stringContaining("- Rewire the DB board"));
    expect(tryouts.size + audit.length).toBe(0);
  });

  it("saves unclear work for review, unclassified", async () => {
    const { service, tryouts, audit } = createTryoutFakes();
    expect(await service.post("lerato", terms({ title: "Not sure yet" }))).toEqual({ outcome: "review", id: "tryout-1" });
    expect(tryouts.get("tryout-1")).toMatchObject({ status: "review", category: null });
    expect(audit[0]?.action).toBe("tryout_sent_to_review");
  });

  it.each([
    ["pay below the floor", terms({ rateCentsPerHour: 3000 }), TERMS_MESSAGES.below_minimum_wage],
    ["under 2 hours' notice", terms({ date: "2026-10-26", startTime: "09:30" }), TERMS_MESSAGES.too_soon],
    ["outside daylight", terms({ startTime: "15:00", hours: 4 }), TERMS_MESSAGES.outside_daylight],
    ["under 4 hours", terms({ hours: 3 }), TERMS_MESSAGES.too_short],
    ["over 8 hours", terms({ startTime: "08:00", hours: 9 }), TERMS_MESSAGES.too_long],
  ])("refuses %s with the right message, before any AI or quota is used", async (_case, input, message) => {
    const { service, tryouts, quota } = createTryoutFakes();
    expect(await refusal(service.post("lerato", input))).toMatchObject({ status: 422, code: "tryout_terms", publicMessage: message });
    expect(fakeCheckWork).not.toHaveBeenCalled();
    expect(tryouts.size + quota.size).toBe(0);
  });

  it(`refuses post number ${RULES.postsPerDay + 1} in a day`, async () => {
    const { service, tryouts } = createTryoutFakes();
    for (let count = 0; count < RULES.postsPerDay; count += 1) await service.post("lerato", terms());
    expect(await refusal(service.post("lerato", terms()))).toMatchObject({ status: 429, publicMessage: TRYOUT_MESSAGES.postsLimit });
    expect(tryouts.size).toBe(RULES.postsPerDay);
  });

  it("fails closed when the AI check fails: nothing is written", async () => {
    const { service, tryouts, audit } = createTryoutFakes();
    fakeCheckWork.mockRejectedValueOnce(new AppError(502, "ai_unavailable", "We couldn't do that right now."));
    await refusal(service.post("lerato", terms()));
    expect(tryouts.size + audit.length).toBe(0);
  });
});

describe("withdraw", () => {
  it("lets the owner withdraw an unbooked tryout once, with an audit entry; twice changes nothing", async () => {
    const { service, tryouts, audit } = createTryoutFakes();
    await service.post("lerato", terms());
    expect(await service.withdraw("lerato", "tryout-1")).toEqual({ status: "withdrawn" });
    expect(await service.withdraw("lerato", "tryout-1")).toEqual({ status: "unchanged" });
    expect(tryouts.get("tryout-1")?.status).toBe("withdrawn");
    expect(audit.map((entry) => entry.action)).toEqual(["tryout_posted", "tryout_withdrawn"]);
  });

  it("treats another owner's tryout as not found, and changes nothing", async () => {
    const { service, tryouts } = createTryoutFakes();
    await service.post("lerato", terms());
    expect(await refusal(service.withdraw("sipho", "tryout-1"))).toMatchObject({ status: 404, publicMessage: TRYOUT_MESSAGES.notFound });
    expect(await refusal(service.withdraw("lerato", "no-such-tryout"))).toMatchObject({ status: 404 });
    expect(tryouts.get("tryout-1")?.status).toBe("published");
  });

  it("refuses a booked tryout", async () => {
    const { service, tryouts } = createTryoutFakes();
    await service.post("lerato", terms());
    const posted = tryouts.get("tryout-1");
    if (posted) tryouts.set("tryout-1", { ...posted, status: "booked" });
    expect(await refusal(service.withdraw("lerato", "tryout-1"))).toMatchObject({ status: 409, publicMessage: TRYOUT_MESSAGES.booked });
  });
});
