import "server-only";
import { decideWelcomeGrant, type CreditEntry } from "@/domain/credits";
import { ID_PROBLEM_MESSAGES, profileProblemMessage } from "@/domain/messages";
import { isProfileComplete, newAccount, photoPath, profileView, type BusinessRecord, type PhotoKind, type ProfileView, type UserRecord } from "@/domain/profile";
import type { Viewer } from "@/domain/demo";
import { decideBusinessSave, decidePhotoSave, decideWorkerEdit, decideWorkerSave, profileEditProblem, type ProfileProblem } from "@/domain/profileDecisions";
import { decideRole, type Role } from "@/domain/roles";
import { checkSaId } from "@/domain/saId";
import type { BusinessProfileInput, SaveResult, WorkerEditInput, YoungPersonProfileInput } from "@/schemas/profile";
import { AppError } from "../errors";
import type { PhotoStore } from "../repositories/photoStore";
import type { Plan, ProfileRepository, StoredProfile } from "../repositories/profileRepository";

export interface ProfileServiceDeps {
  repo: ProfileRepository;
  photos: PhotoStore;
  hashId: (digits: string) => string;
  now: () => Date;
}

// How each refusal is reported over HTTP. The decision itself comes from src/domain.
const HTTP_STATUS: Record<ProfileProblem["code"], number> = {
  role_missing: 409,
  role_locked: 409,
  id_in_use: 409,
  id_locked: 409,
  details_first: 409,
  photo_missing: 422,
  photo_wrong_type: 422,
  photo_too_big: 422,
  pin_imprecise: 422,
  demo_locked: 403,
};

/** Nothing to write: the request matches what is stored, so there's no audit entry either. */
const unchanged = (state: StoredProfile): Plan<SaveResult> => ({ write: null, result: { status: "unchanged", complete: isProfileComplete(state.user, state.business) } });

/** The free credits ride along with the save that first completes a business profile (domain/credits.ts). */
function welcomeCredits(user: UserRecord | null, business: BusinessRecord | null, credits: readonly CreditEntry[]): CreditEntry[] | undefined {
  if (user?.role !== "business") return undefined;
  const grant = decideWelcomeGrant(isProfileComplete(user, business), credits);
  return grant.kind === "append" ? grant.entries : undefined;
}

function refuse(problem: ProfileProblem): never {
  throw new AppError(HTTP_STATUS[problem.code], problem.code, profileProblemMessage(problem));
}

/** Every profile write starts here: a demo account's profile is never changed from the app. */
function editableBy(viewer: Viewer): string {
  const problem = profileEditProblem(viewer);
  if (problem) refuse(problem);
  return viewer.uid;
}

/**
 * Coordinates profile writes. It holds no rules of its own: every decision
 * comes from src/domain, and every write happens inside one repository
 * transaction together with its audit entry.
 */
export function createProfileService({ repo, photos, hashId, now }: ProfileServiceDeps) {
  return {
    async setRole(viewer: Viewer, role: Role): Promise<SaveResult> {
      const uid = editableBy(viewer);
      return repo.transact<SaveResult>(uid, null, (state) => {
        const decision = decideRole(state.user?.role ?? null, role);
        if (decision.kind === "refuse") refuse({ code: "role_locked", current: decision.current });
        if (decision.kind === "unchanged") return unchanged(state);
        const { user, business } = newAccount(uid, decision.role);
        return { write: { user, business: business ?? undefined, audit: "role_set" }, result: { status: "saved", complete: false } };
      });
    },

    async saveWorker(viewer: Viewer, input: YoungPersonProfileInput): Promise<SaveResult> {
      const uid = editableBy(viewer);
      const { idNumber, ...details } = input;
      const check = checkSaId(idNumber, now());
      if (!check.ok) throw new AppError(422, check.error, ID_PROBLEM_MESSAGES[check.error]);
      // Only these two facts and the hash leave this function; the number and date of birth are dropped here.
      const { lastFour, residency } = check.value;
      const idHash = hashId(idNumber);

      return repo.transact<SaveResult>(uid, idHash, (state) => {
        const decision = decideWorkerSave(uid, state, { details, idLastFour: lastFour, residency, idHash });
        if (decision.kind === "refuse") refuse(decision.problem);
        if (decision.kind === "unchanged") return unchanged(state);
        const { user, claimId } = decision.next;
        return {
          write: { user, claimIdHash: claimId ? idHash : undefined, audit: "worker_profile_saved" },
          result: { status: "saved", complete: isProfileComplete(user, state.business) },
        };
      });
    },

    /** Changes to a finished young person's profile, such as how businesses can pay them. */
    async editWorker(viewer: Viewer, input: WorkerEditInput): Promise<SaveResult> {
      const uid = editableBy(viewer);
      return repo.transact<SaveResult>(uid, null, (state) => {
        const decision = decideWorkerEdit(state.user, input);
        if (decision.kind === "refuse") refuse(decision.problem);
        if (decision.kind === "unchanged") return unchanged(state);
        return { write: { user: decision.next, audit: "worker_profile_edited" }, result: { status: "saved", complete: isProfileComplete(decision.next, state.business) } };
      });
    },

    async saveBusiness(viewer: Viewer, input: BusinessProfileInput): Promise<SaveResult> {
      const uid = editableBy(viewer);
      return repo.transact<SaveResult>(uid, null, (state) => {
        const decision = decideBusinessSave(state.user, state.business, input);
        if (decision.kind === "refuse") refuse(decision.problem);
        if (decision.kind === "unchanged") return unchanged(state);
        return {
          write: { business: decision.next, audit: "business_profile_saved", ledger: welcomeCredits(state.user, decision.next, state.credits) },
          result: { status: "saved", complete: isProfileComplete(state.user, decision.next) },
        };
      });
    },

    /** The person's own profile, read in a transaction that writes nothing. */
    async getProfile(uid: string): Promise<ProfileView> {
      return repo.transact<ProfileView>(uid, null, (state) => ({ write: null, result: profileView(state.user, state.business, state.credits) }));
    },

    async savePhoto(viewer: Viewer, kind: PhotoKind): Promise<SaveResult> {
      const uid = editableBy(viewer);
      // The path is built here from the signed-in uid; a path from the browser is never accepted.
      const path = photoPath(uid, kind);
      const meta = await photos.metadata(path);
      return repo.transact<SaveResult>(uid, null, (state) => {
        const decision = decidePhotoSave(state, kind, path, meta);
        if (decision.kind === "refuse") refuse(decision.problem);
        if (decision.kind === "unchanged") return unchanged(state);
        const user = decision.next.user ?? state.user;
        const business = decision.next.business ?? state.business;
        return {
          write: { user: decision.next.user, business: decision.next.business, audit: "photo_saved", ledger: welcomeCredits(user, business, state.credits) },
          result: { status: "saved", complete: isProfileComplete(user, business) },
        };
      });
    },
  };
}

export type ProfileService = ReturnType<typeof createProfileService>;
