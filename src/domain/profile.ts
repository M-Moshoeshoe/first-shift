import { creditBalance, type CreditEntry } from "./credits";
import type { CoidaAnswer } from "./injuryCover";
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
  /** How precise the phone said the reading was, in metres. Stored with the pin and shown to the owner. */
  accuracyMetres: number;
}

/** Why a premises pin couldn't be taken. */
export type LocationProblem = "denied" | "unavailable" | "timeout" | "unsupported" | "imprecise";

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
  /** Registered with the Compensation Fund, as the owner says (injuryCover.ts). Asked in onboarding; older profiles may not have it. */
  coida?: CoidaAnswer;
}

/** users/{uid}. Readable by its owner, so it never holds the ID hash. */
export interface UserRecord extends Partial<Counters>, Partial<WorkerDetails> {
  role: Role;
  status: AccountStatus;
  /** One of the demo accounts: everything it creates is marked demo too (domain/demo.ts). */
  demo?: boolean;
  idLastFour?: string;
  residency?: Residency;
  profilePhoto?: StoredPhoto;
}

/** businesses/{uid}, created with the business role. */
export interface BusinessRecord extends Counters, Partial<Omit<BusinessDetails, "location">> {
  ownerId: string;
  status: AccountStatus;
  demo?: boolean;
  location?: Location;
  shopfrontPhoto?: StoredPhoto;
}

const ZERO_COUNTERS: Counters = { completed: 0, onTime: 0, lateCancellations: 0, noShows: 0 };

/** The records a new role creates. Counters live on whichever side is rated: the young person or the business. */
export function newAccount(uid: string, role: Role, demo = false): { user: UserRecord; business: BusinessRecord | null } {
  const mark = demo ? { demo: true } : {};
  if (role === "young_person") return { user: { role, status: "active", ...mark, ...ZERO_COUNTERS }, business: null };
  return { user: { role, status: "active", ...mark }, business: { ownerId: uid, status: "active", ...mark, ...ZERO_COUNTERS } };
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

/** 27821234567 as a person types it: 082 123 4567. */
export function displayPhone(stored: string): string {
  const local = stored.startsWith("27") ? `0${stored.slice(2)}` : stored;
  return local.length === 10 ? `${local.slice(0, 3)} ${local.slice(3, 6)} ${local.slice(6)}` : local;
}

/**
 * What a person may see of their own profile, for filling forms back in and
 * routing. No counters, no hash, no storage paths.
 */
export interface ProfileView {
  role: Role | null;
  complete: boolean;
  destination: Destination;
  worker: (Partial<WorkerDetails> & { idLastFour?: string; hasPhoto: boolean }) | null;
  business: (Partial<BusinessDetails> & { hasPhoto: boolean; credits: { available: number; onlyFree: boolean } }) | null;
}

export function profileView(user: UserRecord | null, business: BusinessRecord | null, credits: readonly CreditEntry[] = []): ProfileView {
  const worker =
    user?.role === "young_person"
      ? {
          firstName: user.firstName,
          area: user.area,
          availability: user.availability,
          payoutPhone: user.payoutPhone ? displayPhone(user.payoutPhone) : undefined,
          idLastFour: user.idLastFour,
          hasPhoto: Boolean(user.profilePhoto),
        }
      : null;
  const balance = creditBalance(credits);
  const shop =
    user?.role === "business" && business
      ? {
          name: business.name,
          area: business.area,
          openingHours: business.openingHours,
          location: business.location,
          coida: business.coida,
          hasPhoto: Boolean(business.shopfrontPhoto),
          credits: { available: balance.available, onlyFree: balance.onlyFree },
        }
      : null;
  return { role: user?.role ?? null, complete: isProfileComplete(user, business), destination: destinationFor(true, user, business), worker, business: shop };
}

export const DESTINATIONS = ["/sign-in", "/onboarding/role", "/onboarding/work", "/onboarding/business", "/work", "/business"] as const;
export type Destination = (typeof DESTINATIONS)[number];

export function isDestination(path: string): path is Destination {
  return DESTINATIONS.some((destination) => destination === path);
}

/** The other screens each home opens to, listed one by one so nothing else slips through. */
const SCREENS_OF: Partial<Record<Destination, readonly string[]>> = {
  "/business": ["/business/post"],
};

/**
 * Where to send someone who opened path, or null when they belong there.
 * Every account screen is open only while it's the person's destination (or
 * one of that destination's own screens, SCREENS_OF), so nobody skips
 * onboarding, opens the other role's screens or redoes a finished profile.
 * Server routes enforce everything again regardless.
 */
export function redirectFor(path: string, destination: Destination): Destination | null {
  return path === destination || (SCREENS_OF[destination]?.includes(path) ?? false) ? null : destination;
}

/** Where a person belongs right now. Screens redirect with this; server routes enforce everything again. */
export function destinationFor(signedIn: boolean, user: UserRecord | null, business: BusinessRecord | null): Destination {
  if (!signedIn) return "/sign-in";
  if (!user) return "/onboarding/role";
  const complete = isProfileComplete(user, business);
  if (user.role === "young_person") return complete ? "/work" : "/onboarding/work";
  return complete ? "/business" : "/onboarding/business";
}
