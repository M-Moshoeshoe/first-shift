import { describe, expect, it } from "vitest";
import { decideWork } from "@/domain/allowedWork";
import { checkTerms, decideReview, decideWithdraw, newTryout, postedStatus, postingProblem, type TryoutRecord } from "@/domain/tryoutDecisions";
import { TRYOUT_STATUSES } from "@/domain/tryout";
import { real } from "./support/profileFakes";
import { NOW, owner, shop, terms, WELCOME } from "./support/tryoutFakes";

describe("postingProblem", () => {
  it("lets only a business with a complete profile post", () => {
    expect(postingProblem(owner, shop, [WELCOME])).toBeNull();
    expect(postingProblem(null, null, [])).toBe("not_business");
    expect(postingProblem({ role: "young_person", status: "active" }, null, [])).toBe("not_business");
    expect(postingProblem(owner, null, [])).toBe("not_business");
    expect(postingProblem(owner, { ...shop, location: undefined }, [WELCOME])).toBe("profile_incomplete");
  });

  it("needs an available credit", () => {
    expect(postingProblem(owner, shop, [])).toBe("no_credits");
    const allHeld = [WELCOME, ...["a", "b", "c"].map((tryoutId) => ({ kind: "hold" as const, tryoutId }))];
    expect(postingProblem(owner, shop, allHeld)).toBe("no_credits");
  });
});

describe("checkTerms", () => {
  it("returns the window in UTC and the day's pay for valid terms", () => {
    expect(checkTerms(NOW, terms())).toEqual({
      ok: true,
      value: { window: { start: new Date("2026-10-27T07:00:00Z"), end: new Date("2026-10-27T13:00:00Z") }, payCents: 18138 },
    });
  });

  it("reports every problem at once, so the owner fixes them in one go", () => {
    const result = checkTerms(NOW, terms({ date: "2026-10-26", startTime: "07:30", hours: 3, rateCentsPerHour: 2000 }));
    expect(!result.ok && result.error).toEqual(expect.arrayContaining(["too_soon", "too_short", "below_minimum_wage"]));
  });

  it("reports a length outside 4 to 8 hours once, not twice", () => {
    const result = checkTerms(NOW, terms({ startTime: "08:00", hours: 9 }));
    expect(result).toEqual({ ok: false, error: ["too_long"] });
  });

  it("refuses a date or time that isn't real", () => {
    expect(checkTerms(NOW, terms({ date: "2026-02-30" }))).toEqual({ ok: false, error: ["invalid_date"] });
    expect(checkTerms(NOW, terms({ startTime: "25:00" }))).toEqual({ ok: false, error: ["invalid_time"] });
  });
});

describe("postedStatus", () => {
  it("publishes allowed work, sends unclear work to review, refuses blocked work with its safer option", () => {
    expect(postedStatus(decideWork("cleaning", 0.9))).toEqual({ ok: true, value: { status: "published", category: "cleaning" } });
    expect(postedStatus(decideWork("cleaning", 0.3))).toEqual({ ok: true, value: { status: "review", category: null } });
    expect(postedStatus(decideWork("electrical", 0.9))).toMatchObject({ ok: false, error: { category: "electrical", saferOption: expect.any(String) } });
  });
});

describe("newTryout", () => {
  const decided = { window: { start: new Date("2026-10-27T07:00:00Z"), end: new Date("2026-10-27T13:00:00Z") }, payCents: 18138 };

  it("trims the title and tasks and drops blank tasks", () => {
    const record = newTryout(real("lerato"), shop, terms({ title: "  Shop helper ", tasks: [" Pack shelves ", "   "] }), decided, "published", "stock_and_packing");
    expect(record).toMatchObject({ title: "Shop helper", tasks: ["Pack shelves"] });
  });

  it("marks a demo account's tryout demo, and a real one real", () => {
    expect(newTryout({ uid: "lerato", demo: true }, shop, terms(), decided, "published", null)?.demo).toBe(true);
    expect(newTryout(real("lerato"), shop, terms(), decided, "published", null)?.demo).toBe(false);
  });

  it("refuses to build a tryout from an incomplete business", () => {
    expect(newTryout(real("lerato"), { ...shop, shopfrontPhoto: undefined }, terms(), decided, "published", null)).toBeNull();
  });
});

describe("decideWithdraw", () => {
  const record = (status: TryoutRecord["status"]): TryoutRecord => {
    const built = newTryout(real("lerato"), shop, terms(), { window: { start: new Date(), end: new Date() }, payCents: 1 }, "published", null);
    if (!built) throw new Error("fixture");
    return { ...built, status };
  };

  it.each(TRYOUT_STATUSES.map((status) => [status]))("decides for a %s tryout", (status) => {
    const expected = { review: "withdraw", published: "withdraw", withdrawn: "unchanged", booked: "refuse", completed: "refuse" }[status];
    expect(decideWithdraw("lerato", record(status)).kind).toBe(expected);
  });

  it("treats a missing tryout and someone else's alike, as not found", () => {
    expect(decideWithdraw("lerato", null)).toEqual({ kind: "refuse", problem: "not_found" });
    expect(decideWithdraw("sipho", record("published"))).toEqual({ kind: "refuse", problem: "not_found" });
  });
});

describe("decideReview", () => {
  const inReview = (): TryoutRecord => {
    const built = newTryout(real("lerato"), shop, terms(), { window: { start: new Date(), end: new Date() }, payCents: 1 }, "review", null);
    if (!built) throw new Error("fixture");
    return built;
  };

  it("approves with an allowed kind of work, or rejects", () => {
    expect(decideReview(inReview(), "approve", "stock_and_packing")).toEqual({ kind: "approve", category: "stock_and_packing" });
    expect(decideReview(inReview(), "reject")).toEqual({ kind: "reject" });
  });

  it("never lets a reviewer publish blocked work, or approve without naming the work", () => {
    expect(decideReview(inReview(), "approve", "electrical")).toEqual({ kind: "refuse", problem: "blocked_category" });
    expect(decideReview(inReview(), "approve")).toEqual({ kind: "refuse", problem: "blocked_category" });
  });

  it("only reviews tryouts in review", () => {
    expect(decideReview(null, "reject")).toEqual({ kind: "refuse", problem: "not_found" });
    for (const status of ["published", "booked", "completed", "withdrawn"] as const) {
      expect(decideReview({ ...inReview(), status }, "approve", "cleaning")).toEqual({ kind: "refuse", problem: "not_in_review" });
    }
  });
});
