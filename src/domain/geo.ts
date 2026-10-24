import { BASE32, geohashForLocation } from "geofire-common";
import { RULES } from "@/config/rules";

export interface CoarseLocation {
  geohash: string;
  /** The centre of the geohash cell, never the business's exact pin. */
  lat: number;
  lng: number;
}

/** The centre of a geohash cell. Bits alternate longitude then latitude, five to a character. */
function cellCentre(geohash: string): { lat: number; lng: number } {
  const lat = { min: -90, max: 90 };
  const lng = { min: -180, max: 180 };
  let isLng = true;
  for (const char of geohash) {
    const value = BASE32.indexOf(char);
    for (let bit = 4; bit >= 0; bit--) {
      const range = isLng ? lng : lat;
      const mid = (range.min + range.max) / 2;
      if ((value >> bit) & 1) range.min = mid;
      else range.max = mid;
      isLng = !isLng;
    }
  }
  return { lat: (lat.min + lat.max) / 2, lng: (lng.min + lng.max) / 2 };
}

/**
 * Where a tryout appears to be: a cell about 1 km across and its centre.
 * Throws on coordinates outside the globe. The exact pin never leaves the
 * businesses document.
 */
export function coarseLocation(lat: number, lng: number): CoarseLocation {
  const geohash = geohashForLocation([lat, lng], RULES.coarseGeohashPrecision);
  return { geohash, ...cellCentre(geohash) };
}
