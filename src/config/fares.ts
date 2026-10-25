/**
 * Published one-way minibus taxi fares, in cents, each with where it was
 * published. A route works in both directions. Areas use their official names
 * (src/config/areas.ts) where we know them. We never invent a fare: a route
 * that isn't here shows "Fare not known".
 */
const IVORY_PARK_SOURCE = "Ivory Park Taxi Association fares from 4 May 2026, reported by The Citizen";
const RANDBURG_SOURCE = "Randburg United Local and Long Distance Taxi Association, June 2026, reported by the Fourways Review (The Citizen)";

export const TAXI_ROUTES: readonly { a: string; b: string; oneWayCents: number; source: string }[] = [
  { a: "Ivory Park", b: "Midrand", oneWayCents: 1800, source: IVORY_PARK_SOURCE },
  { a: "Ivory Park", b: "Fourways", oneWayCents: 2700, source: IVORY_PARK_SOURCE },
  { a: "Ivory Park", b: "Rosebank", oneWayCents: 2700, source: IVORY_PARK_SOURCE },
  { a: "Ivory Park", b: "Randburg", oneWayCents: 2800, source: IVORY_PARK_SOURCE },
  { a: "Ivory Park", b: "Johannesburg CBD", oneWayCents: 2800, source: IVORY_PARK_SOURCE },
  { a: "Diepsloot", b: "Randburg", oneWayCents: 2600, source: RANDBURG_SOURCE },
  { a: "Diepsloot", b: "Fourways", oneWayCents: 1800, source: RANDBURG_SOURCE },
  { a: "Diepsloot", b: "Lonehill", oneWayCents: 1800, source: RANDBURG_SOURCE },
  { a: "Riverside View", b: "Randburg", oneWayCents: 2600, source: RANDBURG_SOURCE },
  { a: "Riverside View", b: "Fourways", oneWayCents: 1800, source: RANDBURG_SOURCE },
  { a: "Riverside View", b: "Sandton", oneWayCents: 2800, source: RANDBURG_SOURCE },
  { a: "Randburg", b: "Fourways", oneWayCents: 1700, source: RANDBURG_SOURCE },
];
