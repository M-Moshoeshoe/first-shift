import { RULES } from "@/config/rules";
import { canonicaliseArea } from "./areas";
import type { BusinessDetails, BusinessRecord, PhotoKind, Residency, UserRecord, WorkerAbout, WorkerDetails } from "./profile";
import { cleanIntro } from "./workerProfile";
import type { Role } from "./roles";

export type ProfileProblem =
  | { code: "role_missing" }
  | { code: "role_locked"; current: Role }
  | { code: "id_in_use" }
  | { code: "id_locked" }
  | { code: "details_first" }
  | { code: "photo_missing"; kind: PhotoKind }
  | { code: "photo_wrong_type" }
  | { code: "photo_too_big" }
  | { code: "pin_imprecise" }
  | { code: "surname_locked" }
  | { code: "demo_locked" };

/**
 * A demo account's profile is set up by npm run demo:reset and never changed
 * from the app: its password is public, so anyone could otherwise put their
 * own name, photo or ID number on it. Refused before anything is read.
 */
export function profileEditProblem(viewer: { demo: boolean }): ProfileProblem | null {
  return viewer.demo ? { code: "demo_locked" } : null;
}

/** A pin counts only if the phone reports it precisely enough to find the door. */
export function pinPreciseEnough(accuracyMetres: number): boolean {
  return accuracyMetres > 0 && accuracyMetres <= RULES.pinMaxAccuracyMetres;
}

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
  details: WorkerDetails & WorkerAbout & { legalSurname: string };
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
  // Known areas are stored under one name, so "ivory prk" and "Ivory Park" are the same place (and a resend is unchanged).
  const details = { ...input.details, area: canonicaliseArea(input.details.area), intro: cleanIntro(input.details.intro) };
  const unchanged =
    claim.kind === "already_yours" &&
    user.firstName === details.firstName &&
    user.area === details.area &&
    sameList(user.availability, details.availability) &&
    user.payoutPhone === details.payoutPhone &&
    sameList(user.payMethods, details.payMethods) &&
    sameList(user.skills, details.skills) &&
    sameList(user.languages, details.languages) &&
    user.intro === details.intro &&
    user.legalSurname === details.legalSurname &&
    user.idLastFour === input.idLastFour &&
    user.residency === input.residency;
  if (unchanged) return { kind: "unchanged" };

  const next: UserRecord = { ...user, ...details, idLastFour: input.idLastFour, residency: input.residency };
  return { kind: "save", next: { user: next, claimId: claim.kind === "claim" } };
}

/** What a young person can change after onboarding (WorkerEditSchema). Their name, ID and number stay as onboarding set them. */
export interface WorkerEdit extends WorkerAbout {
  payMethods: WorkerDetails["payMethods"];
  /** Only for a profile from before it was asked: a surname, like an ID, is set once. */
  legalSurname?: string;
}

/**
 * A young person changes their profile after onboarding. Only a finished
 * profile can be edited; the same answer again changes nothing. A surname
 * already saved can't be changed here, so a record can't move to another name.
 */
export function decideWorkerEdit(user: UserRecord | null, input: WorkerEdit): SaveDecision<UserRecord> {
  const problem = roleProblem(user, "young_person");
  if (problem || !user) return { kind: "refuse", problem: problem ?? { code: "role_missing" } };
  if (!user.firstName || !user.idLastFour) return { kind: "refuse", problem: { code: "details_first" } };
  const surname = input.legalSurname?.trim();
  if (user.legalSurname && surname && surname !== user.legalSurname) return { kind: "refuse", problem: { code: "surname_locked" } };
  const next: UserRecord = { ...user, payMethods: [...input.payMethods], skills: [...input.skills], languages: [...input.languages], intro: cleanIntro(input.intro), legalSurname: user.legalSurname ?? surname };
  const unchanged =
    sameList(user.payMethods, next.payMethods ?? []) && sameList(user.skills, next.skills ?? []) && sameList(user.languages, next.languages ?? []) && user.intro === next.intro && user.legalSurname === next.legalSurname;
  return unchanged ? { kind: "unchanged" } : { kind: "save", next };
}

export interface OwnerSave {
  legalName: string;
  /** 27XXXXXXXXX. */
  phone: string;
  cipc?: string;
  idLastFour: string;
  residency: Residency;
  idHash: string;
}

/** The first name young people see once booked: the first word of the owner's legal name. */
export const firstNameOf = (legalName: string): string => legalName.trim().split(/\s+/)[0] ?? "";

/**
 * The business owner's own details (docs/RULES.md, Accountability): the
 * same ID rules as a young person's, set once and one per owner account,
 * with the full name and the last four digits kept for an admin only.
 */
export function decideOwnerSave(
  uid: string,
  state: { user: UserRecord | null; business: BusinessRecord | null; heldIdHash: string | null; claimOwner: string | null },
  input: OwnerSave,
): SaveDecision<{ user: UserRecord; business: BusinessRecord; claimId: boolean }> {
  const problem = roleProblem(state.user, "business");
  if (problem || !state.user || !state.business) return { kind: "refuse", problem: problem ?? { code: "role_missing" } };
  if (!state.business.name) return { kind: "refuse", problem: { code: "details_first" } };
  const claim = decideIdClaim(uid, input.idHash, state.heldIdHash, state.claimOwner);
  if (claim.kind === "refuse") return claim;
  const legalName = input.legalName.trim().replace(/\s+/g, " ");
  const cipc = input.cipc?.trim() || undefined;
  const { user, business } = state;
  const unchanged =
    claim.kind === "already_yours" &&
    user.legalName === legalName &&
    user.idLastFour === input.idLastFour &&
    user.residency === input.residency &&
    business.ownerPhone === input.phone &&
    business.cipc === cipc;
  if (unchanged) return { kind: "unchanged" };
  return {
    kind: "save",
    next: {
      user: { ...user, legalName, idLastFour: input.idLastFour, residency: input.residency },
      business: { ...business, ownerFirstName: firstNameOf(legalName), ownerPhone: input.phone, ...(cipc ? { cipc } : {}) },
      claimId: claim.kind === "claim",
    },
  };
}

/** Saves a business's details. A save without a pin, or without the COIDA answer, keeps the one already set. */
export function decideBusinessSave(user: UserRecord | null, business: BusinessRecord | null, input: BusinessDetails): SaveDecision<BusinessRecord> {
  const problem = roleProblem(user, "business");
  if (problem) return { kind: "refuse", problem };
  if (!business) return { kind: "refuse", problem: { code: "role_missing" } };
  const details = { ...input, area: canonicaliseArea(input.area) };
  if (details.location && !pinPreciseEnough(details.location.accuracyMetres)) return { kind: "refuse", problem: { code: "pin_imprecise" } };

  const location = details.location ?? business.location;
  const coida = details.coida ?? business.coida;
  const unchanged =
    business.coida === coida &&
    business.name === details.name &&
    business.area === details.area &&
    business.openingHours === details.openingHours &&
    business.location?.latitude === location?.latitude &&
    business.location?.longitude === location?.longitude &&
    business.location?.accuracyMetres === location?.accuracyMetres;
  if (unchanged) return { kind: "unchanged" };
  return { kind: "save", next: { ...business, name: details.name, area: details.area, openingHours: details.openingHours, location, coida } };
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
  // A face ("profile") is the young person's, or the business owner's; a shopfront only a business has.
  const problem = kind === "shopfront" ? roleProblem(state.user, "business") : state.user ? null : ({ code: "role_missing" } as const);
  if (problem) return { kind: "refuse", problem };
  const detailsSaved = kind === "shopfront" ? Boolean(state.business?.name) : state.user?.role === "business" ? Boolean(state.user.legalName) : Boolean(state.user?.firstName);
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
