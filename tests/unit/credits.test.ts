import { describe, expect, it } from "vitest";
import { RULES } from "@/config/rules";
import { canPost, creditBalance, decideHold, decideRelease, decideUse, decideWelcomeGrant, type CreditDecision, type CreditEntry } from "@/domain/credits";

const welcome: CreditEntry = { kind: "grant", amount: RULES.freeCredits, reason: "welcome" };

/** Applies a decision the way the repository does: append, or leave the ledger as it is. */
const apply = (entries: CreditEntry[], decision: CreditDecision): CreditEntry[] => (decision.kind === "append" ? [...entries, ...decision.entries] : entries);

describe("creditBalance", () => {
  it("is granted minus used minus held", () => {
    const entries: CreditEntry[] = [welcome, { kind: "hold", tryoutId: "a" }, { kind: "hold", tryoutId: "b" }, { kind: "use", tryoutId: "b" }];
    expect(creditBalance(entries)).toEqual({ granted: 3, used: 1, held: 1, available: 1, onlyFree: true });
  });

  it("counts a released hold as available again", () => {
    expect(creditBalance([welcome, { kind: "hold", tryoutId: "a" }, { kind: "release", tryoutId: "a" }]).available).toBe(3);
  });

  it("counts a hold again after a release, for a tryout booked a second time", () => {
    const entries: CreditEntry[] = [welcome, { kind: "hold", tryoutId: "a" }, { kind: "release", tryoutId: "a" }, { kind: "hold", tryoutId: "a" }];
    expect(creditBalance(entries)).toMatchObject({ held: 1, available: 2 });
  });

  it("is zero with no ledger, and says when a credit has been bought", () => {
    expect(creditBalance([])).toEqual({ granted: 0, used: 0, held: 0, available: 0, onlyFree: true });
    expect(creditBalance([welcome, { kind: "grant", amount: 5, reason: "top_up" }])).toMatchObject({ available: 8, onlyFree: false });
  });
});

describe("canPost", () => {
  it("needs at least one available credit", () => {
    expect(canPost([])).toBe(false);
    expect(canPost([welcome])).toBe(true);
    const allHeld: CreditEntry[] = [welcome, ...["a", "b", "c"].map((tryoutId): CreditEntry => ({ kind: "hold", tryoutId }))];
    expect(canPost(allHeld)).toBe(false);
  });
});

describe("decideWelcomeGrant", () => {
  it(`grants ${RULES.freeCredits} free credits once, when the profile is complete`, () => {
    expect(decideWelcomeGrant(false, [])).toEqual({ kind: "unchanged" });
    expect(decideWelcomeGrant(true, [])).toEqual({ kind: "append", entries: [welcome] });
    expect(decideWelcomeGrant(true, [welcome])).toEqual({ kind: "unchanged" });
  });

  it("never grants again after the free credits are spent", () => {
    const spent: CreditEntry[] = [welcome, ...["a", "b", "c"].flatMap((tryoutId): CreditEntry[] => [{ kind: "hold", tryoutId }, { kind: "use", tryoutId }])];
    expect(decideWelcomeGrant(true, spent)).toEqual({ kind: "unchanged" });
  });
});

describe("hold, use and release", () => {
  it("walks one credit from held to used", () => {
    let ledger: CreditEntry[] = [welcome];
    ledger = apply(ledger, decideHold(ledger, "a"));
    expect(creditBalance(ledger).available).toBe(2);
    ledger = apply(ledger, decideUse(ledger, "a"));
    expect(creditBalance(ledger)).toMatchObject({ used: 1, held: 0, available: 2 });
  });

  it("treats a repeated hold, use or release as a harmless retry", () => {
    const held: CreditEntry[] = [welcome, { kind: "hold", tryoutId: "a" }];
    expect(decideHold(held, "a")).toEqual({ kind: "unchanged" });
    const used = apply(held, decideUse(held, "a"));
    expect(decideUse(used, "a")).toEqual({ kind: "unchanged" });
    expect(decideHold(used, "a")).toEqual({ kind: "unchanged" });
    expect(decideRelease(used, "a")).toEqual({ kind: "unchanged" });
    expect(decideRelease([welcome], "a")).toEqual({ kind: "unchanged" });
  });

  it("refuses to hold with no credit available, and to use a credit that was never held", () => {
    const allHeld: CreditEntry[] = [welcome, ...["a", "b", "c"].map((tryoutId): CreditEntry => ({ kind: "hold", tryoutId }))];
    expect(decideHold(allHeld, "d")).toEqual({ kind: "refuse", problem: "no_credits" });
    expect(decideUse([welcome], "a")).toEqual({ kind: "refuse", problem: "not_held" });
    const released = apply([welcome, { kind: "hold", tryoutId: "a" }], decideRelease([welcome, { kind: "hold", tryoutId: "a" }], "a"));
    expect(decideUse(released, "a")).toEqual({ kind: "refuse", problem: "not_held" });
  });

  it("releases a held credit for a cancelled booking, so it can be held again", () => {
    let ledger: CreditEntry[] = [welcome, { kind: "hold", tryoutId: "a" }];
    ledger = apply(ledger, decideRelease(ledger, "a"));
    expect(creditBalance(ledger).available).toBe(3);
    expect(decideHold(ledger, "a")).toEqual({ kind: "append", entries: [{ kind: "hold", tryoutId: "a" }] });
  });

  it("only ever appends: no decision changes an earlier entry", () => {
    const ledger: CreditEntry[] = [welcome, { kind: "hold", tryoutId: "a" }];
    const before = structuredClone(ledger);
    for (const decision of [decideHold(ledger, "b"), decideUse(ledger, "a"), decideRelease(ledger, "a")]) {
      expect(apply(ledger, decision).slice(0, ledger.length)).toEqual(before);
    }
  });
});
