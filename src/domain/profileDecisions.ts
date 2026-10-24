import { RULES } from "@/config/rules";
import type { BusinessDetails, BusinessRecord, PhotoKind, Residency, UserRecord, WorkerDetails } from "./profile";
import type { Role } from "./roles";

export type ProfileProblem =
  | { code: "role_missing" }
  | { code: "role_locked"; current: Role }
  | { code: "id_in_use" }
  | { code: "id_locked" }
  | { code: "details_first" }
  | { code: "photo_missing"; kind: PhotoKind }
  | { code: "photo_wrong_type" }
  | { code: "photo_too_big" };

export type SaveDecision<T> = { kind: "save"; next: T } | { kind: "unchanged" } | { kind: "refuse"; problem: ProfileProblem };

export type IdClaimDecision = { kind: "claim" } | { kind: "already_yours" } | { kind: "refuse"; problem: ProfileProblem };

/**
 * One ID, one account, set once. heldHash is the ID this account already
 * holds; claimOwner is whoever holds newHash now. Resending your own ID is fine.
 */
export function decideIdClaim(uid: string, newHash: string, heldHash: string | null, claimOwner: string | null): IdClaimDecision {
  if (heldHash !== null && heldHash !== newHash) return { kind: "refuse", problem: { code: "id_locked" } };
  if (claimOwner !== null && claimOwner !== uid) return { kind: "refuse", problem: { code: "id_in_use" } };
  return claimOwner === uid ? { kind: "already_yours" } : { kind: "claim" };
}

function roleProblem(user: UserRecord | null, needed: Role): ProfileProblem | null {
  if (!user) return { code: "role_missing" };
  return user.role === needed ? null : { code: "role_locked", current: user.role };
}

const sameList = (a: readonly string[] | undefined, b: readonly string[]) => a !== undefined && a.length === b.length && a.every((value, index) => value === b[index]);

export interface WorkerSave {
  details: WorkerDetails;
  idLastFour: string;
  residency: Residency;
  idHash: string;
}

/** Saves a young person's details and claims their ID. Identical resends change nothing. */
export function decideWorkerSave(
  uid: string,
  state: { user: UserRecord | null; heldIdHash: string | null; claimOwner: string | null },
  input: WorkerSave,
): SaveDecision<{ user: UserRecord; claimId: boolean }> {
  const problem = roleProblem(state.user, "young_person");
  if (problem || !state.user) return { kind: "refuse", problem: problem ?? { code: "role_missing" } };

  const claim = decideIdClaim(uid, input.idHash, state.heldIdHash, state.claimOwner);
  if (claim.kind === "refuse") return claim;

  const { user } = state;
  const { details } = input;
  const unchanged =
    claim.kind === "already_yours" &&
    user.firstName === details.firstName &&
    user.area === details.area &&
    sameList(user.availability, details.availability) &&
    user.payoutPhone === details.payoutPhone &&
    user.idLastFour === input.idLastFour &&
    user.residency === input.residency;
  if (unchanged) return { kind: "unchanged" };

  const next: UserRecord = { ...user, ...details, idLastFour: input.idLastFour, residency: input.residency };
  return { kind: "save", next: { user: next, claimId: claim.kind === "claim" } };
}

/** Saves a business's details. A save without a pin keeps any pin already set. */
export function decideBusinessSave(user: UserRecord | null, business: BusinessRecord | null, details: BusinessDetails): SaveDecision<BusinessRecord> {
  const problem = roleProblem(user, "business");
  if (problem) return { kind: "refuse", problem };
  if (!business) return { kind: "refuse", problem: { code: "role_missing" } };

  const location = details.location ?? business.location;
  const unchanged =
    business.name === details.name &&
    business.area === details.area &&
    business.openingHours === details.openingHours &&
    business.location?.latitude === location?.latitude &&
    business.location?.longitude === location?.longitude;
  if (unchanged) return { kind: "unchanged" };
  return { kind: "save", next: { ...business, name: details.name, area: details.area, openingHours: details.openingHours, location } };
}

export interface PhotoMeta {
  contentType: string;
  size: number;
  version: string;
}

/** Records a photo the person uploaded to their own folder, after checking what Storage holds. */
export function decidePhotoSave(
  state: { user: UserRecord | null; business: BusinessRecord | null },
  kind: PhotoKind,
  path: string,
  meta: PhotoMeta | null,
): SaveDecision<{ user?: UserRecord; business?: BusinessRecord }> {
  const problem = roleProblem(state.user, kind === "profile" ? "young_person" : "business");
  if (problem) return { kind: "refuse", problem };
  const detailsSaved = kind === "profile" ? Boolean(state.user?.firstName) : Boolean(state.business?.name);
  if (!detailsSaved) return { kind: "refuse", problem: { code: "details_first" } };

  if (!meta) return { kind: "refuse", problem: { code: "photo_missing", kind } };
  if (!RULES.photoContentTypes.some((type) => type === meta.contentType)) return { kind: "refuse", problem: { code: "photo_wrong_type" } };
  if (meta.size >= RULES.photoMaxBytes) return { kind: "refuse", problem: { code: "photo_too_big" } };

  const photo = { path, version: meta.version };
  const current = kind === "profile" ? state.user?.profilePhoto : state.business?.shopfrontPhoto;
  if (current?.path === photo.path && current.version === photo.version) return { kind: "unchanged" };

  if (kind === "profile" && state.user) return { kind: "save", next: { user: { ...state.user, profilePhoto: photo } } };
  if (kind === "shopfront" && state.business) return { kind: "save", next: { business: { ...state.business, shopfrontPhoto: photo } } };
  return { kind: "refuse", problem: { code: "details_first" } };
}
