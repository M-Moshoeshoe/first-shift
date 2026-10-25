import { TAXI_ROUTES } from "@/config/fares";
import { canonicaliseArea } from "./areas";
import type { Cents } from "./money";

export interface ReturnFare {
  returnCents: Cents;
  source: string;
}

/** Matching ignores case and spacing, and known areas match under any spelling ("ivory prk" is Ivory Park). */
const key = (area: string): string => canonicaliseArea(area).trim().toLowerCase().replace(/\s+/g, " ");

const ONE_WAY = new Map(TAXI_ROUTES.flatMap((route) => [[`${key(route.a)}|${key(route.b)}`, route], [`${key(route.b)}|${key(route.a)}`, route]] as const));

/**
 * The return fare for a known route, or null when we have no published fare.
 * We never invent a fare: the screen says the fare isn't known instead.
 */
export function returnFare(fromArea: string, toArea: string): ReturnFare | null {
  const route = ONE_WAY.get(`${key(fromArea)}|${key(toArea)}`);
  return route ? { returnCents: route.oneWayCents * 2, source: route.source } : null;
}

/** Every area with a published fare from this one, by the name a tryout stores (its business's official area). */
export function fareRouteAreas(fromArea: string): string[] {
  const from = key(fromArea);
  return TAXI_ROUTES.flatMap((route) => (key(route.a) === from ? [route.b] : key(route.b) === from ? [route.a] : []));
}

/** What the young person keeps after the return taxi fare, or null when the fare isn't known. Never below zero. */
export function keepAfterFare(payCents: Cents, returnFareCents: Cents | null): Cents | null {
  return returnFareCents === null ? null : Math.max(0, payCents - returnFareCents);
}
