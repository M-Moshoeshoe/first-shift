import { geohashForLocation } from "geofire-common";
import { describe, expect, it } from "vitest";
import { RULES } from "@/config/rules";
import { coarseLocation } from "@/domain/geo";

// A precision-6 cell is 15 bits of latitude and 15 of longitude.
const HALF_CELL_LAT = 180 / 2 ** 15 / 2;
const HALF_CELL_LNG = 360 / 2 ** 15 / 2;

describe("coarseLocation", () => {
  const tembisa = { lat: -25.99634, lng: 28.22711 };

  it("matches the standard geohash at precision 6", () => {
    expect(coarseLocation(57.64911, 10.40744).geohash).toBe("u4pruy");
    expect(coarseLocation(tembisa.lat, tembisa.lng).geohash).toHaveLength(RULES.coarseGeohashPrecision);
  });

  it("returns the centre of the cell, which lies in the same cell", () => {
    const coarse = coarseLocation(tembisa.lat, tembisa.lng);
    expect(geohashForLocation([coarse.lat, coarse.lng], RULES.coarseGeohashPrecision)).toBe(coarse.geohash);
    expect(Math.abs(coarse.lat - tembisa.lat)).toBeLessThanOrEqual(HALF_CELL_LAT);
    expect(Math.abs(coarse.lng - tembisa.lng)).toBeLessThanOrEqual(HALF_CELL_LNG);
  });

  it("never returns the exact pin", () => {
    const coarse = coarseLocation(tembisa.lat, tembisa.lng);
    expect(coarse.lat).not.toBe(tembisa.lat);
    expect(coarse.lng).not.toBe(tembisa.lng);
    expect(JSON.stringify(coarse)).not.toContain(String(tembisa.lat));
    expect(JSON.stringify(coarse)).not.toContain(String(tembisa.lng));
  });

  it("gives two shops in the same cell the same answer", () => {
    const a = coarseLocation(tembisa.lat, tembisa.lng);
    const b = coarseLocation(a.lat + HALF_CELL_LAT / 2, a.lng - HALF_CELL_LNG / 2);
    expect(b).toEqual(a);
  });

  it("throws on coordinates outside the globe", () => {
    expect(() => coarseLocation(91, 0)).toThrow();
    expect(() => coarseLocation(0, 181)).toThrow();
  });
});
