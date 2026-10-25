import "server-only";
import { RULES } from "@/config/rules";
import { applyState, decideApply, decideWithdrawApplication, type ApplyState } from "@/domain/applications";
import { areaCentre } from "@/domain/areas";
import { sameWorld, type Viewer } from "@/domain/demo";
import { CLOSED_MESSAGES, FINDING_MESSAGES, NOT_ELIGIBLE_MESSAGES } from "@/domain/findingMessages";
import { feedItem, nearbyFeed, searchBounds } from "@/domain/nearby";
import type { UserRecord } from "@/domain/profile";
import type { ApplicationResult, NearbyResponse, TryoutDetailResponse } from "@/schemas/finding";
import { AppError } from "../errors";
import type { FindingRepository } from "../repositories/findingRepository";
import type { ProfileRepository } from "../repositories/profileRepository";

export interface FindingServiceDeps {
  finding: FindingRepository;
  /** Read only: the young person's own user record. */
  profiles: ProfileRepository;
  consumeQuota: (uid: string, bucket: string, limit: number, options: { message: string }) => Promise<void>;
  now: () => Date;
}

const notFound = () => new AppError(404, "not_found", FINDING_MESSAGES.notFound);

/** How each refusal is reported over HTTP. The decision itself comes from src/domain (applications.ts). */
function refusal(problem: Exclude<ApplyState, { kind: "can_apply" | "applied" }>["reason"] | "not_found"): AppError {
  if (problem === "not_found") return notFound();
  if (problem === "booking_closed" || problem === "not_open") return new AppError(409, problem, CLOSED_MESSAGES[problem]);
  return new AppError(problem === "not_young_person" ? 403 : 409, problem, NOT_ELIGIBLE_MESSAGES[problem]);
}

/**
 * Coordinates the nearby feed, the tryout detail and applying. It holds no
 * rules of its own: every decision comes from src/domain, demo and real
 * never meet (domain/demo.ts), and an application is written in one
 * repository transaction with the tryout's applicant count and its audit entry.
 */
export function createFindingService({ finding, profiles, consumeQuota, now }: FindingServiceDeps) {
  const worker = async (uid: string): Promise<UserRecord | null> => (await profiles.transact(uid, null, (state) => ({ write: null, result: state }))).user;

  /** The tryout as this viewer may see it: one from the other world reads as not found, like one that doesn't exist. */
  async function visible(viewer: Viewer, tryoutId: string) {
    const listing = await finding.listing(tryoutId);
    if (!listing || !sameWorld(viewer, listing.tryout)) throw notFound();
    return listing;
  }

  async function currentState(viewer: Viewer, tryoutId: string, user: UserRecord | null): Promise<ApplyState> {
    const { tryout, application, bookings } = await finding.read(tryoutId, viewer.uid);
    if (!tryout) throw notFound();
    return applyState({ worker: user, tryout, application, bookings, now: now() });
  }

  return {
    /** Published tryouts open for booking within the radius of the young person's area, soonest first. */
    async nearby(viewer: Viewer): Promise<NearbyResponse> {
      const user = await worker(viewer.uid);
      if (user?.role !== "young_person" || !user.area) throw refusal("not_young_person");
      const centre = areaCentre(user.area);
      if (!centre) return { status: "unknown_area", area: user.area };
      const listings = await finding.publishedIn(searchBounds(centre));
      return { status: "ok", area: user.area, items: nearbyFeed(viewer, { area: user.area, centre }, listings, now()) };
    },

    async detail(viewer: Viewer, tryoutId: string): Promise<TryoutDetailResponse> {
      const [listing, user] = await Promise.all([visible(viewer, tryoutId), worker(viewer.uid)]);
      const area = user?.area ?? "";
      const state = await currentState(viewer, tryoutId, user);
      return { item: feedItem(listing, { area, centre: areaCentre(area) }), tasks: listing.tryout.tasks, state };
    },

    /**
     * Applies. The rules come first, so a refusal costs nothing; then the
     * daily limit; then the transaction decides again on what's stored now.
     */
    async apply(viewer: Viewer, tryoutId: string, note: string): Promise<ApplicationResult> {
      const user = await worker(viewer.uid);
      const decide = (state: Awaited<ReturnType<FindingRepository["read"]>>) => decideApply(viewer, { ...state, tryoutId, worker: user, now: now() }, note);
      const first = decide(await finding.read(tryoutId, viewer.uid));
      if (first.kind === "refuse") throw refusal(first.problem);
      if (first.kind === "unchanged") return { status: "unchanged", state: { kind: "applied" } };

      await consumeQuota(viewer.uid, "applications", RULES.applicationsPerDay, { message: FINDING_MESSAGES.applyLimit });
      return finding.transact<ApplicationResult>(tryoutId, viewer.uid, (state) => {
        const decision = decide(state);
        if (decision.kind === "refuse") throw refusal(decision.problem);
        if (decision.kind === "unchanged") return { write: null, result: { status: "unchanged", state: { kind: "applied" } } };
        return { write: { application: decision.record, applicantsDelta: 1, audit: "application_made" }, result: { status: "applied", state: { kind: "applied" } } };
      });
    },

    /** The young person takes their application back. Twice is harmless. */
    async withdraw(viewer: Viewer, tryoutId: string): Promise<ApplicationResult> {
      const user = await worker(viewer.uid);
      const status = await finding.transact<ApplicationResult["status"]>(tryoutId, viewer.uid, ({ application }) => {
        const decision = decideWithdrawApplication(viewer.uid, application);
        if (decision.kind === "refuse" || !application) throw new AppError(404, "not_found", FINDING_MESSAGES.applicationNotFound);
        if (decision.kind === "unchanged") return { write: null, result: "unchanged" };
        return { write: { application: { ...application, status: "withdrawn" }, applicantsDelta: -1, audit: "application_withdrawn" }, result: "withdrawn" };
      });
      return { status, state: await currentState(viewer, tryoutId, user) };
    },
  };
}

export type FindingService = ReturnType<typeof createFindingService>;
