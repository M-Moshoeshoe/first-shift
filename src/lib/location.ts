import type { Location, LocationProblem } from "@/domain/profile";
import { pinPreciseEnough } from "@/domain/profileDecisions";
import { fail, ok, type Result } from "@/domain/result";

/** Ask for GPS-quality readings, wait at most 15 seconds, and never reuse an old one. */
export const LOCATION_OPTIONS: PositionOptions = { enableHighAccuracy: true, timeout: 15_000, maximumAge: 0 };

/** The browser's error codes: 1 permission denied, 2 position unavailable, 3 timeout. */
export function problemFromCode(code: number): LocationProblem {
  if (code === 1) return "denied";
  if (code === 3) return "timeout";
  return "unavailable";
}

/** Turns a reading into a pin, only if it's precise enough to find the door (domain rule). */
export function pinFromReading(coords: { latitude: number; longitude: number; accuracy: number }): Result<Location, LocationProblem> {
  if (!pinPreciseEnough(coords.accuracy)) return fail("imprecise");
  return ok({ latitude: coords.latitude, longitude: coords.longitude, accuracyMetres: Math.ceil(coords.accuracy) });
}

/** Asks the phone where it is, once. Every way it can go wrong comes back as a LocationProblem. */
export function findPin(): Promise<Result<Location, LocationProblem>> {
  if (typeof navigator === "undefined" || !navigator.geolocation) return Promise.resolve(fail("unsupported"));
  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      (position) => resolve(pinFromReading(position.coords)),
      (error) => resolve(fail(problemFromCode(error.code))),
      LOCATION_OPTIONS,
    );
  });
}
