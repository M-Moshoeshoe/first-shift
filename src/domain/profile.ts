import { creditBalance, type CreditEntry } from "./credits";
import type { CoidaAnswer } from "./injuryCover";
import type { PaymentMethod } from "./paymentFlow";
import type { Language, Skill } from "./workerProfile";
import type { Role } from "./roles";
import type { IdCheck } from "./saId";

export const AVAILABILITY = ["weekday_mornings", "weekday_afternoons", "saturdays", "sundays"] as const;
export type Availability = (typeof AVAILABILITY)[number];

export const PHOTO_KINDS = ["profile", "shopfront"] as const;
export type PhotoKind = (typeof PHOTO_KINDS)[number];

/** Paused (an unpaid tryout, or a harassment or unsafe-work report) and suspended (three strikes) stop someone taking part (strikes.ts). */
export const ACCOUNT_STATUSES = ["active", "paused", "suspended"] as const;
export type AccountStatus = (typeof ACCOUNT_STATUSES)[number];
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
  /** How businesses can pay them, at least one (paymentFlow.ts). Profiles from before it was asked have none until they choose. */
  payMethods: PaymentMethod[];
}

export interface BusinessDetails {
  name: string;
  area: string;
  openingHours: string;
  location?: Location;
  /** Registered with the Compensation Fund, as the owner says (injuryCover.ts). Asked in onboarding; older profiles may not have it. */
  coida?: CoidaAnswer;
}

/** What a young person says about themselves on the owner's shortlist (workerProfile.ts). */
export interface WorkerAbout {
  skills: Skill[];
  languages: Language[];
  /** Cleaned of contact details (cleanIntro); may be empty. */
  intro: string;
}

/**
 * users/{uid}. Readable only by its owner (firestore.rules), so it never
 * holds the ID hash. The legal names and the last four ID digits are for an
 * admin to look someone up (SECURITY.md, Privacy): the server never shows
 * them to anyone else, except the last four digits at the door.
 */
export interface UserRecord extends Partial<Counters>, Partial<WorkerDetails>, Partial<WorkerAbout> {
  role: Role;
  status: AccountStatus;
  /** One of the demo accounts: everything it creates is marked demo too (domain/demo.ts). */
  demo?: boolean;
  idLastFour?: string;
  residency?: Residency;
  /** The person's face: the young person's, or the business owner's. */
  profilePhoto?: StoredPhoto;
  /** A young person's legal surname, private: only the first name is ever shown. */
  legalSurname?: string;
  /** A business owner's full legal name, private: young people see the first name once booked. */
  legalName?: string;
}

/** businesses/{uid}, created with the business role. */
export interface BusinessRecord extends Counters, Partial<Omit<BusinessDetails, "location">> {
  ownerId: string;
  status: AccountStatus;
  /** Why it's paused, when it is: an unpaid tryout (day.ts, unpaidPause) or a report's case id. */
  pausedFor?: string | null;
  demo?: boolean;
  location?: Location;
  shopfrontPhoto?: StoredPhoto;
  /** Shown to the young person once booked, with the owner's photo, so they know who to ask for (bookings.ts). */
  ownerFirstName?: string;
  /** 27XXXXXXXXX: the owner's contact number, given to the young person once booked, for WhatsApp. */
  ownerPhone?: string;
  /** The CIPC registration number, when the business has one. */
  cipc?: string;
  /** Payments counted towards "Paid on time", and how many were on time (day.ts, payRecordCounters). Absent until the first. */
  payments?: number;
  paidOnTime?: number;
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

/**
 * Asked after a profile was first finished: a young person's ways to be
 * paid, what they can do, their languages and their surname. Without them
 * they can't apply; Profile asks for them (applications.ts).
 */
export const needsWorkerUpdate = (user: UserRecord): boolean => !user.payMethods?.length || !user.skills?.length || !user.languages?.length || !user.legalSurname;

/** The owner's details: full legal name, ID, face and contact number. A business without them can't post (tryoutDecisions.ts). */
export const ownerReady = (user: UserRecord | null, business: BusinessRecord | null): boolean =>
  Boolean(user?.legalName && user.idLastFour && user.profilePhoto && business?.ownerPhone && business.ownerFirstName);

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
  worker: (Partial<WorkerDetails> & Partial<WorkerAbout> & { idLastFour?: string; hasPhoto: boolean; hasSurname: boolean }) | null;
  business:
    | (Partial<BusinessDetails> & {
        hasPhoto: boolean;
        credits: { available: number; onlyFree: boolean };
        /** The owner's own details, to fill the form back in. Never anyone else's. */
        owner: { legalName?: string; idLastFour?: string; phone?: string; cipc?: string; hasPhoto: boolean; ready: boolean };
      })
    | null;
}

export function profileView(user: UserRecord | null, business: BusinessRecord | null, credits: readonly CreditEntry[] = []): ProfileView {
  const worker =
    user?.role === "young_person"
      ? {
          firstName: user.firstName,
          area: user.area,
          availability: user.availability,
          payoutPhone: user.payoutPhone ? displayPhone(user.payoutPhone) : undefined,
          payMethods: user.payMethods,
          skills: user.skills,
          languages: user.languages,
          intro: user.intro,
          idLastFour: user.idLastFour,
          hasPhoto: Boolean(user.profilePhoto),
          hasSurname: Boolean(user.legalSurname),
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
          owner: {
            legalName: user.legalName,
            idLastFour: user.idLastFour,
            phone: business.ownerPhone ? displayPhone(business.ownerPhone) : undefined,
            cipc: business.cipc,
            hasPhoto: Boolean(user.profilePhoto),
            ready: ownerReady(user, business),
          },
        }
      : null;
  return { role: user?.role ?? null, complete: isProfileComplete(user, business), destination: destinationFor(true, user, business), worker, business: shop };
}

export const DESTINATIONS = ["/sign-in", "/onboarding/role", "/onboarding/work", "/onboarding/business", "/work", "/business"] as const;
export type Destination = (typeof DESTINATIONS)[number];

export function isDestination(path: string): path is Destination {
  return DESTINATIONS.some((destination) => destination === path);
}

/** The other screens each home opens to, listed one by one (or by an exact pattern) so nothing else slips through. */
// Ids have the same shape the routes accept (server/validate.ts, parseId).
const BOOKING_PAGE = /^\/bookings\/[A-Za-z0-9_-]{1,128}$/;
const SCREENS_OF: Partial<Record<Destination, readonly (string | RegExp)[]>> = {
  "/business": ["/business/post", "/business/owner", /^\/business\/tryouts\/[A-Za-z0-9_-]{1,128}$/, BOOKING_PAGE],
  "/work": [/^\/work\/tryouts\/[A-Za-z0-9_-]{1,128}$/, "/work/applications", "/work/profile", BOOKING_PAGE],
};

const opensTo = (destination: Destination, path: string): boolean =>
  SCREENS_OF[destination]?.some((screen) => (typeof screen === "string" ? screen === path : screen.test(path))) ?? false;

/**
 * Where to send someone who opened path, or null when they belong there.
 * Every account screen is open only while it's the person's destination (or
 * one of that destination's own screens, SCREENS_OF), so nobody skips
 * onboarding, opens the other role's screens or redoes a finished profile.
 * Server routes enforce everything again regardless.
 */
export function redirectFor(path: string, destination: Destination): Destination | null {
  return path === destination || opensTo(destination, path) ? null : destination;
}

/** Where a person belongs right now. Screens redirect with this; server routes enforce everything again. */
export function destinationFor(signedIn: boolean, user: UserRecord | null, business: BusinessRecord | null): Destination {
  if (!signedIn) return "/sign-in";
  if (!user) return "/onboarding/role";
  const complete = isProfileComplete(user, business);
  if (user.role === "young_person") return complete ? "/work" : "/onboarding/work";
  return complete ? "/business" : "/onboarding/business";
}
