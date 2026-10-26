import "server-only";
import { casePriority, decideResolution, orderCases, RESOLUTION_PROBLEMS, subjectOf, type Resolution } from "@/domain/review";
import { AppError } from "../errors";
import type { CaseContext, ResolveWrite, ReviewRepository } from "../repositories/reviewRepository";

export interface ReviewServiceDeps {
  reviews: ReviewRepository;
  /** An admin's credit grant (creditService.ts), for a case resolved by adding credits. */
  grant: (businessId: string, amount: number, reason: string, admin: string) => Promise<unknown>;
}

const notFound = () => new AppError(404, "not_found", "There's no case with that id.");

/** What the resolution writes, from the actions the domain has allowed. */
function resolveWrite(context: CaseContext, resolution: Resolution): ResolveWrite {
  const write: ResolveWrite = { outcome: resolution.outcome.trim(), reason: resolution.reason.trim(), admin: resolution.admin, status: [], strikes: [], overturn: [], reference: null };
  for (const action of resolution.actions) {
    if (action.kind === "pause" || action.kind === "unpause" || action.kind === "strike") {
      const uid = subjectOf(action.party, context.parties);
      if (!uid) continue;
      if (action.kind === "strike") write.strikes.push({ uid, party: action.party, reason: action.reason });
      else write.status.push({ uid, party: action.party, to: action.kind === "pause" ? "paused" : "active" });
    }
    if (action.kind === "overturn") write.overturn.push(action.strikeId);
    if (action.kind === "reference" && context.item.kind === "reference_challenge") {
      // Upheld: the reference comes off for good. Rejected: it's back with the young person to add or leave off.
      write.reference = { id: context.item.referenceId, status: action.verdict === "uphold" ? "withdrawn" : "draft" };
    }
  }
  return write;
}

/**
 * The review list for admins (npm run review:case): open cases by priority,
 * a case's full context, and resolving it. Every decision comes from
 * src/domain (review.ts); every change is audit-logged with the reasoning.
 */
export function createReviewService({ reviews, grant }: ReviewServiceDeps) {
  return {
    async list() {
      return orderCases(await reviews.open()).map((open) => ({ ...open, priority: casePriority(open.item) }));
    },

    async context(caseId: string): Promise<CaseContext> {
      const context = await reviews.context(caseId);
      if (!context) throw notFound();
      return context;
    },

    async resolve(caseId: string, resolution: Resolution): Promise<{ closed: true; actions: number }> {
      const context = await reviews.context(caseId);
      if (!context) throw notFound();
      const first = decideResolution(context.item, context.parties, resolution);
      if (first.kind === "refuse") throw new AppError(422, first.problem, RESOLUTION_PROBLEMS[first.problem]);
      // Credits go through the ledger's own transaction, audit-logged with the same reason, before the case closes.
      for (const action of resolution.actions) if (action.kind === "grant") await grant(context.parties.businessId, action.amount, resolution.reason, resolution.admin);
      return reviews.transactResolve(caseId, (state) => {
        if (!state) throw notFound();
        const decision = decideResolution(state.item, state.parties, resolution);
        if (decision.kind === "refuse") throw new AppError(422, decision.problem, RESOLUTION_PROBLEMS[decision.problem]);
        return { write: resolveWrite(state, resolution), result: { closed: true, actions: resolution.actions.length } };
      });
    },
  };
}

export type ReviewService = ReturnType<typeof createReviewService>;
