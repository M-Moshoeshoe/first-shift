import "server-only";
import { creditBalance, creditHistory, decideAdminGrant, decideCreditRequest, freeLeft } from "@/domain/credits";
import { GRANT_PROBLEMS, historyLine } from "@/domain/creditsCopy";
import type { Viewer } from "@/domain/demo";
import { POSTING_PROBLEM_MESSAGES } from "@/domain/tryoutMessages";
import type { CreditRequestResult, CreditsViewResponse } from "@/schemas/credits";
import { AppError } from "../errors";
import type { CreditRepository } from "../repositories/creditRepository";

export interface CreditServiceDeps {
  credits: CreditRepository;
  now: () => Date;
}

const notBusiness = () => new AppError(403, "not_business", POSTING_PROBLEM_MESSAGES.not_business);

/**
 * The Credits screen, requests for more, and an admin's grant. Every
 * decision comes from src/domain (credits.ts); each write is one repository
 * transaction with its audit entries.
 */
export function createCreditService({ credits, now }: CreditServiceDeps) {
  return {
    async view(viewer: Viewer): Promise<CreditsViewResponse> {
      const { state, entries, requests, titles } = await credits.history(viewer.uid);
      if (!state.isBusiness) throw notBusiness();
      const balance = creditBalance(state.ledger);
      const [open] = state.open;
      return {
        available: balance.available,
        held: balance.held,
        freeLeft: freeLeft(state.ledger),
        history: creditHistory(entries, requests, titles).map((event) => ({ at: event.at.toISOString(), text: historyLine(event) })),
        request: open ? { requestedAt: open.at.toISOString() } : null,
      };
    },

    /** "Request more credits": an admin case, once; asking again shows the first request. */
    async request(viewer: Viewer): Promise<CreditRequestResult> {
      const at = now();
      return credits.transactRequest<CreditRequestResult>(viewer.uid, (state) => {
        const decision = decideCreditRequest(state.isBusiness, state.open.length > 0);
        if (decision.kind === "refuse") throw notBusiness();
        const [open] = state.open;
        if (decision.kind === "unchanged" && open) return { write: null, result: { status: "unchanged", requestedAt: open.at.toISOString() } };
        return { write: { at }, result: { status: "requested", requestedAt: at.toISOString() } };
      });
    },

    /** npm run credits:grant: adds credits with a reason, audit-logged under the admin's name, and closes any open request. */
    async grant(businessId: string, amount: number, reason: string, admin: string): Promise<{ granted: number; closed: number }> {
      return credits.transactGrant(businessId, (state) => {
        const decision = decideAdminGrant(state.isBusiness, amount, reason);
        if (decision.kind === "refuse") throw new AppError(422, decision.problem, GRANT_PROBLEMS[decision.problem]);
        const close = state.open.map((request) => request.id);
        return { write: { entries: decision.entries, close, admin, reason: reason.trim() }, result: { granted: amount, closed: close.length } };
      });
    },
  };
}

export type CreditService = ReturnType<typeof createCreditService>;
