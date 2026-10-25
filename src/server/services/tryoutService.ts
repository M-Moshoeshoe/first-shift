import "server-only";
import { RULES } from "@/config/rules";
import type { WorkDecision } from "@/domain/allowedWork";
import type { Viewer } from "@/domain/demo";
import { asksForMoney } from "@/domain/scamRules";
import { checkText, suggestHours } from "@/domain/tryout";
import { checkTerms, decideWithdraw, newTryout, postedStatus, postingProblem, type TryoutTerms } from "@/domain/tryoutDecisions";
import { POSTING_PROBLEM_MESSAGES, TRYOUT_MESSAGES, termsMessage } from "@/domain/tryoutMessages";
import type { TryoutDraft } from "@/schemas/ai";
import type { DraftResult, PostResult, WithdrawResult } from "@/schemas/tryout";
import { AppError } from "../errors";
import { log } from "../log";
import type { ProfileRepository, StoredProfile } from "../repositories/profileRepository";
import type { TryoutRepository } from "../repositories/tryoutRepository";

export interface TryoutServiceDeps {
  tryouts: TryoutRepository;
  /** Read only: the poster's own user and business records. */
  profiles: ProfileRepository;
  draftTryout: (description: string) => Promise<TryoutDraft>;
  checkWork: (text: string) => Promise<WorkDecision>;
  consumeQuota: (uid: string, bucket: string, limit: number, options: { message: string }) => Promise<void>;
  aiDailyLimit: number;
  now: () => Date;
}

/**
 * Coordinates drafting, posting and withdrawing. It holds no rules of its
 * own: every decision comes from src/domain, the AI only drafts and
 * classifies, and every write happens in one repository transaction with its
 * audit entry. Anything that fails, fails closed: nothing is written.
 */
/** An AI failure, reworded for what the owner tapped; anything else passes through unchanged. */
function inContext(error: unknown, message: string): unknown {
  return error instanceof AppError && error.code === "ai_unavailable" ? new AppError(error.status, error.code, message) : error;
}

/** Young people never pay anyone to get a tryout (scamRules.ts): refused in code, before the AI sees it. */
function refuseIfAsksForMoney(uid: string, text: string): void {
  if (!asksForMoney(text)) return;
  log("warn", "tryout_asks_for_money", { uid });
  throw new AppError(422, "asks_for_money", TRYOUT_MESSAGES.asksForMoney);
}

export function createTryoutService({ tryouts, profiles, draftTryout, checkWork, consumeQuota, aiDailyLimit, now }: TryoutServiceDeps) {
  /** The poster's own records, read in a transaction that writes nothing; refused unless they may post. */
  async function poster(uid: string): Promise<StoredProfile> {
    const state = await profiles.transact<StoredProfile>(uid, null, (stored) => ({ write: null, result: stored }));
    const problem = postingProblem(state.user, state.business, state.credits);
    if (problem) throw new AppError(problem === "not_business" ? 403 : 409, problem, POSTING_PROBLEM_MESSAGES[problem]);
    return state;
  }

  return {
    /** One sentence to a draft. The draft and the safety check run side by side; nothing is written. */
    async draft(uid: string, description: string): Promise<DraftResult> {
      await poster(uid);
      refuseIfAsksForMoney(uid, description);
      await consumeQuota(uid, "ai", aiDailyLimit, { message: TRYOUT_MESSAGES.aiLimit });
      const [checked, drafted] = await Promise.allSettled([checkWork(checkText("", [], description)), draftTryout(description)]);
      // Fail closed: no safety answer, no draft. A blocked answer stands whatever happened to the draft.
      if (checked.status === "rejected") throw inContext(checked.reason, TRYOUT_MESSAGES.aiDraftUnavailable);
      const work = checked.value;
      if (work.decision === "blocked") {
        log("warn", "tryout_draft_blocked", { uid, category: work.category });
        return { outcome: "blocked", saferOption: work.saferOption };
      }
      if (drafted.status === "rejected") throw inContext(drafted.reason, TRYOUT_MESSAGES.aiDraftUnavailable);
      const draft = drafted.value;
      return { outcome: work.decision, draft: { title: draft.title, tasks: draft.tasks, hours: suggestHours(draft.hours) } };
    },

    /**
     * Posts the reviewed tryout. The rules come first, so a refused post costs
     * nothing; then the safety check runs AGAIN on the final title and tasks,
     * because the owner may have edited them after the draft. Allowed is saved
     * as published, unclear as review; blocked writes nothing.
     */
    async post(viewer: Viewer, terms: TryoutTerms): Promise<PostResult> {
      const { uid } = viewer;
      const { business } = await poster(uid);
      const decided = checkTerms(now(), terms);
      if (!decided.ok) throw new AppError(422, "tryout_terms", termsMessage(decided.error));
      refuseIfAsksForMoney(uid, checkText(terms.title, terms.tasks, terms.description));

      await consumeQuota(uid, "posts", RULES.postsPerDay, { message: TRYOUT_MESSAGES.postsLimit });
      const work = await checkWork(checkText(terms.title, terms.tasks, terms.description)).catch((error: unknown) => {
        throw inContext(error, TRYOUT_MESSAGES.aiCheckUnavailable);
      });
      const posted = postedStatus(work);
      if (!posted.ok) {
        log("warn", "tryout_post_blocked", { uid, category: posted.error.category });
        return { outcome: "blocked", saferOption: posted.error.saferOption };
      }

      const record = business ? newTryout(viewer, business, terms, decided.value, posted.value.status, posted.value.category) : null;
      // postingProblem has already checked the profile is complete; a missing field here is a broken record.
      if (!record) throw new Error("business_record_incomplete");
      const id = await tryouts.create(record, posted.value.status === "published" ? "tryout_posted" : "tryout_sent_to_review");
      return { outcome: posted.value.status, id };
    },

    /** The owner withdraws a tryout nobody is booked on. Twice is harmless. */
    async withdraw(uid: string, id: string): Promise<WithdrawResult> {
      return tryouts.transact<WithdrawResult>(id, uid, (tryout) => {
        const decision = decideWithdraw(uid, tryout);
        if (decision.kind === "unchanged") return { write: null, result: { status: "unchanged" } };
        if (decision.kind === "withdraw") return { write: { status: "withdrawn", audit: "tryout_withdrawn" }, result: { status: "withdrawn" } };
        const status = decision.problem === "not_found" ? 404 : 409;
        throw new AppError(status, decision.problem, TRYOUT_MESSAGES[decision.problem === "not_found" ? "notFound" : decision.problem]);
      });
    },
  };
}

export type TryoutService = ReturnType<typeof createTryoutService>;
