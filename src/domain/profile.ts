import type { Role } from "./roles";
import type { IdCheck } from "./saId";

export const AVAILABILITY = ["weekday_mornings", "weekday_afternoons", "saturdays", "sundays"] as const;
export type Availability = (typeof AVAILABILITY)[number];

export const PHOTO_KINDS = ["profile", "shopfront"] as const;
export type PhotoKind = (typeof PHOTO_KINDS)[number];

export type AccountStatus = "active";
export type Residency = IdCheck["residency"];

/** A track record, set to 0 once when the account is created and never reset by a profile save. */
export interface Counters {
  completed: number;
  onTime: number;
  lateCancellations: number;
  noShows: number;
}

export interface Location {
  latitude: number;
  longitude: number;
}

/** A photo in Storage. version changes whenever the file is replaced. */
export interface StoredPhoto {
  path: string;
  version: string;
}

export interface WorkerDetails {
  firstName: string;
  area: string;
  availability: Availability[];
  /** Always 27XXXXXXXXX. */
  payoutPhone: string;
}

export interface BusinessDetails {
  name: string;
  area: string;
  openingHours: string;
  location?: Location;
}

/** users/{uid}. Readable by its owner, so it never holds the ID hash. */
export interface UserRecord extends Partial<Counters>, Partial<WorkerDetails> {
  role: Role;
  status: AccountStatus;
  idLastFour?: string;
  residency?: Residency;
  profilePhoto?: StoredPhoto;
}

/** businesses/{uid}, created with the business role. */
export interface BusinessRecord extends Counters, Partial<Omit<BusinessDetails, "location">> {
  ownerId: string;
  status: AccountStatus;
  location?: Location;
  shopfrontPhoto?: StoredPhoto;
}

const ZERO_COUNTERS: Counters = { completed: 0, onTime: 0, lateCancellations: 0, noShows: 0 };

/** The records a new role creates. Counters live on whichever side is rated: the young person or the business. */
export function newAccount(uid: string, role: Role): { user: UserRecord; business: BusinessRecord | null } {
  if (role === "young_person") return { user: { role, status: "active", ...ZERO_COUNTERS }, business: null };
  return { user: { role, status: "active" }, business: { ownerId: uid, status: "active", ...ZERO_COUNTERS } };
}

export function photoPath(uid: string, kind: PhotoKind): string {
  return `photos/${uid}/${kind}.jpg`;
}

export function isProfileComplete(user: UserRecord | null, business: BusinessRecord | null): boolean {
  if (!user) return false;
  if (user.role === "young_person") {
    return Boolean(user.firstName && user.area && user.availability?.length && user.payoutPhone && user.idLastFour && user.profilePhoto);
  }
  return Boolean(business?.name && business.area && business.openingHours && business.location && business.shopfrontPhoto);
}

export type Destination = "/sign-in" | "/onboarding/role" | "/onboarding/work" | "/onboarding/business" | "/work" | "/business";

/** Where a person belongs right now. Screens redirect with this; server routes enforce everything again. */
export function destinationFor(signedIn: boolean, user: UserRecord | null, business: BusinessRecord | null): Destination {
  if (!signedIn) return "/sign-in";
  if (!user) return "/onboarding/role";
  const complete = isProfileComplete(user, business);
  if (user.role === "young_person") return complete ? "/work" : "/onboarding/work";
  return complete ? "/business" : "/onboarding/business";
}
