import type { Cents } from "./money";

export interface ReturnFare {
  returnCents: Cents;
  source: string;
}

const IVORY_PARK_SOURCE = "Ivory Park Taxi Association fares from 4 May 2026, reported by The Citizen";

/** One-way minibus taxi fares from Ivory Park Ext 2, in cents. */
const FROM_IVORY_PARK: Record<string, Cents> = {
  midrand: 1800,
  fourways: 2700,
  rosebank: 2700,
  randburg: 2800,
  "johannesburg cbd": 2800,
};

const normalise = (area: string): string => area.trim().toLowerCase().replace(/\s+/g, " ");

/**
 * The return fare for a known route, or null when we have no published fare.
 * We never invent a fare: the screen says the fare isn't known instead.
 */
export function returnFare(fromArea: string, toArea: string): ReturnFare | null {
  const from = normalise(fromArea);
  const to = normalise(toArea);
  if (from === to) return null;

  const oneWay = from === "ivory park" ? FROM_IVORY_PARK[to] : to === "ivory park" ? FROM_IVORY_PARK[from] : undefined;
  return oneWay === undefined ? null : { returnCents: oneWay * 2, source: IVORY_PARK_SOURCE };
}
