import { describe, expect, it } from "vitest";
import { creditHistory, decideAdminGrant, decideCreditRequest, freeLeft, type CreditEntry } from "@/domain/credits";
import { CREDITS_COPY, historyLine } from "@/domain/creditsCopy";
import { fromSast } from "@/domain/time";
import { AppError } from "@/server/errors";
import type { CreditRepository, CreditState, GrantWrite } from "@/server/repositories/creditRepository";
import { createCreditService } from "@/server/services/creditService";

const WELCOME: CreditEntry = { kind: "grant", amount: 3, reason: "welcome" };
const day = (n: number) => fromSast(2026, 10, n, 9, 0);

describe("free credits left", () => {
  it("spends the free credits first: holds and uses come out of them", () => {
    expect(freeLeft([WELCOME])).toBe(3);
    expect(freeLeft([WELCOME, { kind: "hold", tryoutId: "a" }])).toBe(2);
    expect(freeLeft([WELCOME, { kind: "hold", tryoutId: "a" }, { kind: "use", tryoutId: "a" }, { kind: "hold", tryoutId: "b" }, { kind: "release", tryoutId: "b" }])).toBe(2);
    expect(freeLeft([WELCOME, { kind: "grant", amount: 5, reason: "granted" }, ...["a", "b", "c", "d"].map((tryoutId) => ({ kind: "use" as const, tryoutId }))])).toBe(0);
  });
});

describe("the history, in plain words", () => {
  it("lists grants, holds, uses, returns and requests, newest first, naming each tryout", () => {
    const entries = [
      { entry: WELCOME, at: day(20) },
      { entry: { kind: "hold", tryoutId: "t1" } as CreditEntry, at: day(21) },
      { entry: { kind: "use", tryoutId: "t1" } as CreditEntry, at: day(22) },
      { entry: { kind: "hold", tryoutId: "t2" } as CreditEntry, at: day(23) },
      { entry: { kind: "release", tryoutId: "t2" } as CreditEntry, at: day(24) },
      { entry: { kind: "grant", amount: 5, reason: "granted" } as CreditEntry, at: day(26) },
    ];
    const lines = creditHistory(entries, [day(25)], new Map([["t1", "Phone shop helper"], ["t2", "Stock count helper"]])).map(historyLine);
    expect(lines).toEqual([
      "5 credits added by First Shift",
      "You asked for more credits",
      "1 credit returned: Stock count helper",
      "1 credit set aside for Stock count helper",
      "1 credit used: Phone shop helper",
      "1 credit set aside for Phone shop helper",
      "3 credits added, free",
    ]);
  });

  it("says the launch prices as text only, from the credit price", () => {
    expect(CREDITS_COPY.launch).toBe("At launch: 5 tryouts for R125 or 10 for R250, by card or Instant EFT.");
    expect(CREDITS_COPY.requested("Mon 26 Oct")).toBe("Requested on Mon 26 Oct. We'll add them and let you know.");
  });
});

describe("requests and grants", () => {
  it("keeps one request open at a time, for a business only", () => {
    expect(decideCreditRequest(true, false)).toEqual({ kind: "request" });
    expect(decideCreditRequest(true, true)).toEqual({ kind: "unchanged" });
    expect(decideCreditRequest(false, false)).toEqual({ kind: "refuse", problem: "not_business" });
  });

  it("grants a whole number from 1 to 50, always with a reason", () => {
    expect(decideAdminGrant(true, 5, "Pilot week 1")).toEqual({ kind: "append", entries: [{ kind: "grant", amount: 5, reason: "granted" }] });
    for (const amount of [0, -1, 2.5, 51, Number.NaN]) expect(decideAdminGrant(true, amount, "Pilot")).toEqual({ kind: "refuse", problem: "amount" });
    expect(decideAdminGrant(true, 5, "  ")).toEqual({ kind: "refuse", problem: "reason" });
    expect(decideAdminGrant(false, 5, "Pilot")).toEqual({ kind: "refuse", problem: "not_business" });
  });
});

/** In memory, all or nothing like Firestore: a plan reads copies and only a returned write changes anything. */
function fakeCredits(isBusiness = true) {
  const state: CreditState & { closed: string[]; audit: string[] } = { isBusiness, demo: false, ledger: [WELCOME], open: [], closed: [], audit: [] };
  const read = (): CreditState => structuredClone({ isBusiness: state.isBusiness, demo: state.demo, ledger: state.ledger, open: state.open });
  const repo: CreditRepository = {
    async history() {
      return { state: read(), entries: state.ledger.map((entry, index) => ({ entry, at: day(20 + index) })), requests: state.open.map((request) => request.at), titles: new Map() };
    },
    async transactRequest(_id, plan) {
      const { write, result } = plan(read());
      if (write) {
        state.open.push({ id: `case-${state.open.length + 1}`, at: write.at });
        state.audit.push("credits_requested");
      }
      return result;
    },
    async transactGrant(_id, plan) {
      const { write, result } = plan(read());
      if (write) {
        const grant: GrantWrite = write;
        state.ledger.push(...grant.entries);
        state.closed.push(...grant.close);
        state.open = state.open.filter((request) => !grant.close.includes(request.id));
        state.audit.push(`admin_credits_granted:${grant.admin}:${grant.reason}`);
      }
      return result;
    },
  };
  return { state, service: createCreditService({ credits: repo, now: () => day(26) }) };
}

describe("the credit service", () => {
  const sipho = { uid: "sipho", demo: false };

  it("asks for more credits once, and says when", async () => {
    const { state, service } = fakeCredits();
    expect(await service.request(sipho)).toEqual({ status: "requested", requestedAt: day(26).toISOString() });
    expect(await service.request(sipho)).toEqual({ status: "unchanged", requestedAt: day(26).toISOString() });
    expect(state.audit).toEqual(["credits_requested"]);
    expect((await service.view(sipho)).request).toEqual({ requestedAt: day(26).toISOString() });
  });

  it("adds credits on an admin's grant, closes the request and records who and why", async () => {
    const { state, service } = fakeCredits();
    await service.request(sipho);
    expect(await service.grant("sipho", 5, " Pilot week 1 ", "mokhachane")).toEqual({ granted: 5, closed: 1 });
    expect(state.audit.at(-1)).toBe("admin_credits_granted:mokhachane:Pilot week 1");
    const view = await service.view(sipho);
    expect(view).toMatchObject({ available: 8, held: 0, freeLeft: 3, request: null });
    expect(view.history[0]?.text).toBe("5 credits added by First Shift");
  });

  it("refuses anyone who isn't a business, and a grant without a reason", async () => {
    const notBusiness = fakeCredits(false);
    await expect(notBusiness.service.view(sipho)).rejects.toBeInstanceOf(AppError);
    await expect(notBusiness.service.request(sipho)).rejects.toMatchObject({ status: 403 });
    const { service, state } = fakeCredits();
    await expect(service.grant("sipho", 5, "", "mokhachane")).rejects.toMatchObject({ code: "reason" });
    expect(state.ledger).toEqual([WELCOME]);
  });
});
