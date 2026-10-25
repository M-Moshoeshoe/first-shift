import { distanceBetween, geohashQueryBounds } from "geofire-common";
import { RULES } from "@/config/rules";
import { bookingOpen } from "./applications";
import { sameWorld, type Viewer } from "./demo";
import { returnFare } from "./fares";
import { FEED_COPY } from "./findingMessages";
import { injuryCoverLine, type CoidaAnswer } from "./injuryCover";
import type { TryoutRecord } from "./tryoutDecisions";

export interface Point {
  lat: number;
  lng: number;
}

/** The geohash ranges that cover the search circle. Each is one Firestore range query on location.geohash. */
export const searchBounds = (centre: Point): [string, string][] => geohashQueryBounds([centre.lat, centre.lng], RULES.nearbyRadiusKm * 1000);

/** Straight-line distance in km. Geohash ranges over-cover the circle, so every result is checked with this. */
export const distanceKm = (a: Point, b: Point): number => distanceBetween([a.lat, a.lng], [b.lat, b.lng]);

/** "about 4 km", from the tryout's 1 km cell centre, so never more precise than that. */
export const aboutHowFar = (km: number): string => (km < 1 ? "under 1 km" : `about ${Math.round(km)} km`);

/** A published tryout and what the feed needs to know about its business. */
export interface Listing {
  id: string;
  tryout: TryoutRecord;
  business: { completed: number; coida?: CoidaAnswer; payments?: number; paidOnTime?: number };
}

/** "Paid on time: 4 of 5" once any payment has counted (day.ts, payRecordCounters); "New on First Shift" until then. */
export const payRecordLine = (business: Listing["business"]): string =>
  (business.payments ?? 0) > 0 ? FEED_COPY.paidOnTime(business.paidOnTime ?? 0, business.payments ?? 0) : FEED_COPY.newBusiness;

/** One slip in the feed or on the detail page: everything a young person decides on, and nothing about where exactly the business is. */
export interface FeedItem {
  id: string;
  title: string;
  businessName: string;
  area: string;
  startAt: string;
  endAt: string;
  hours: number;
  rateCentsPerHour: number;
  payCents: number;
  /** Return minibus taxi fare from the young person's area, or null when we have no published fare. */
  returnFareCents: number | null;
  /** "about 4 km" from the young person's area; null when we don't know where their area is. */
  distance: string | null;
  injuryCover: string;
  /** The business's reputation for paying: "Paid on time: N of N", or "New on First Shift". */
  payRecord: string;
}

export function feedItem(listing: Listing, from: { area: string; centre: Point | null }): FeedItem {
  const { tryout } = listing;
  return {
    id: listing.id,
    title: tryout.title,
    businessName: tryout.businessName,
    area: tryout.area,
    startAt: tryout.startAt.toISOString(),
    endAt: tryout.endAt.toISOString(),
    hours: tryout.hours,
    rateCentsPerHour: tryout.rateCentsPerHour,
    payCents: tryout.payCents,
    returnFareCents: returnFare(from.area, tryout.area)?.returnCents ?? null,
    distance: from.centre ? aboutHowFar(distanceKm(from.centre, tryout.location)) : null,
    injuryCover: injuryCoverLine(listing.business.coida),
    payRecord: payRecordLine(listing.business),
  };
}

/**
 * Where a young person can get to: within the radius of their area's centre,
 * or anywhere with a published direct taxi fare from their area, because a
 * published fare means people make that trip every day (Ivory Park to
 * Randburg is about 21 km, and R56 return).
 */
export const withinReach = (from: { area: string; centre: Point }, tryout: Pick<TryoutRecord, "area" | "location">): boolean =>
  distanceKm(from.centre, tryout.location) <= RULES.nearbyRadiusKm || returnFare(from.area, tryout.area) !== null;

/**
 * The feed: published tryouts still open for booking, within reach, in
 * the viewer's world only (demo or real), soonest first. Listings come from
 * the geohash range queries and the route areas, which may overlap and
 * over-cover; each is kept once and checked here.
 */
export function nearbyFeed(viewer: Viewer, from: { area: string; centre: Point }, listings: readonly Listing[], now: Date): FeedItem[] {
  const unique = [...new Map(listings.map((listing) => [listing.id, listing])).values()];
  return unique
    .filter(({ tryout }) => sameWorld(viewer, tryout) && bookingOpen(tryout, now) && withinReach(from, tryout))
    .sort((a, b) => a.tryout.startAt.getTime() - b.tryout.startAt.getTime())
    .map((listing) => feedItem(listing, from));
}
