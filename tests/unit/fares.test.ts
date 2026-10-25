import { describe, expect, it } from "vitest";
import { fareRouteAreas, returnFare } from "@/domain/fares";

// Every published route: one-way rand, both directions, returned as a return fare in cents.
const ROUTES: [string, string, number][] = [
  ["Ivory Park", "Midrand", 18],
  ["Ivory Park", "Fourways", 27],
  ["Ivory Park", "Rosebank", 27],
  ["Ivory Park", "Randburg", 28],
  ["Ivory Park", "Johannesburg CBD", 28],
  ["Diepsloot", "Randburg", 26],
  ["Diepsloot", "Fourways", 18],
  ["Diepsloot", "Lonehill", 18],
  ["Riverside View", "Randburg", 26],
  ["Riverside View", "Fourways", 18],
  ["Riverside View", "Sandton", 28],
  ["Randburg", "Fourways", 17],
];

describe("returnFare", () => {
  it.each(ROUTES)("%s to %s is R%i each way, in both directions", (a, b, rand) => {
    expect(returnFare(a, b)?.returnCents).toBe(rand * 200);
    expect(returnFare(b, a)?.returnCents).toBe(rand * 200);
  });

  it("names its source", () => {
    expect(returnFare("Diepsloot", "Randburg")?.source).toContain("Randburg United Local and Long Distance Taxi Association");
    expect(returnFare("Ivory Park", "Randburg")?.source).toContain("Ivory Park Taxi Association");
  });

  it("matches any spelling of a known area", () => {
    expect(returnFare("ivory prk ext 2", "RANDBURG")?.returnCents).toBe(5600);
    expect(returnFare("four ways", "diepsloot")?.returnCents).toBe(3600);
  });

  it("returns null instead of inventing a fare for unknown routes", () => {
    expect(returnFare("Soweto", "Sandton")).toBeNull();
    expect(returnFare("Ivory Park", "Ivory Park")).toBeNull();
    expect(returnFare("Diepsloot", "Sandton")).toBeNull();
  });
});

describe("fareRouteAreas", () => {
  it("lists every area with a published fare from this one, by its stored name", () => {
    expect(fareRouteAreas("Diepsloot")).toEqual(["Randburg", "Fourways", "Lonehill"]);
    expect(fareRouteAreas("randburg").sort()).toEqual(["Diepsloot", "Fourways", "Ivory Park", "Riverside View"]);
    expect(fareRouteAreas("Soweto")).toEqual([]);
  });
});
