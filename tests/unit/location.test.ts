import { describe, expect, it } from "vitest";
import { RULES } from "@/config/rules";
import { LOCATION_MESSAGES, PROFILE_MESSAGES, pinPrecisionText } from "@/domain/messages";
import { newAccount, type BusinessRecord, type UserRecord } from "@/domain/profile";
import { decideBusinessSave, pinPreciseEnough } from "@/domain/profileDecisions";
import { AppError } from "@/server/errors";
import { LOCATION_OPTIONS, pinFromReading, problemFromCode } from "@/lib/location";
import { BusinessProfileSchema } from "@/schemas/profile";
import { createFakeStore, fakeService } from "./support/profileFakes";

const IVORY_PARK = { latitude: -25.9992, longitude: 28.1916 };

describe("asking the phone for its location", () => {
  it("asks for a fresh, high-accuracy reading within 15 seconds", () => {
    expect(LOCATION_OPTIONS).toEqual({ enableHighAccuracy: true, timeout: 15_000, maximumAge: 0 });
  });

  it("maps the browser's error codes to a reason the owner can act on", () => {
    expect(problemFromCode(1)).toBe("denied");
    expect(problemFromCode(2)).toBe("unavailable");
    expect(problemFromCode(3)).toBe("timeout");
    expect(LOCATION_MESSAGES.imprecise).toBe(PROFILE_MESSAGES.pinImprecise);
  });
});

describe("pin precision: 150 metres or better", () => {
  it("accepts up to the limit and refuses past it, or a reading with no accuracy", () => {
    expect(pinPreciseEnough(RULES.pinMaxAccuracyMetres)).toBe(true);
    expect(pinPreciseEnough(RULES.pinMaxAccuracyMetres + 0.5)).toBe(false);
    expect(pinPreciseEnough(0)).toBe(false);
  });

  it("keeps the accuracy with the pin, rounded up to whole metres", () => {
    expect(pinFromReading({ ...IVORY_PARK, accuracy: 19.2 })).toEqual({ ok: true, value: { ...IVORY_PARK, accuracyMetres: 20 } });
    expect(pinFromReading({ ...IVORY_PARK, accuracy: 900 })).toEqual({ ok: false, error: "imprecise" });
  });

  it("tells the owner how precise it was, in plain words", () => {
    expect(pinPrecisionText(20)).toBe("Pinned to within 20 metres.");
    expect(pinPrecisionText(0.4)).toBe("Pinned to within 1 metre.");
  });
});

describe("the server enforces the pin rule too", () => {
  const owner: UserRecord = { role: "business", status: "active" };
  const shop = newAccount("sipho", "business").business as BusinessRecord;
  const details = { name: "Sipho's Phone Repairs", area: "Ivory Park", openingHours: "8:00 to 17:00" };

  it("refuses an imprecise pin even if the browser sent it", async () => {
    expect(decideBusinessSave(owner, shop, { ...details, location: { ...IVORY_PARK, accuracyMetres: 900 } })).toEqual({ kind: "refuse", problem: { code: "pin_imprecise" } });
    const store = createFakeStore();
    const service = fakeService(store);
    await service.setRole("sipho", "business");
    const before = store.snapshot();
    const error = await service.saveBusiness("sipho", { ...details, location: { ...IVORY_PARK, accuracyMetres: 900 } }).catch((caught: unknown) => caught);
    expect(error).toBeInstanceOf(AppError);
    expect((error as AppError).publicMessage).toBe(PROFILE_MESSAGES.pinImprecise);
    expect(store.snapshot()).toBe(before);
  });

  it("needs the accuracy with every pin", () => {
    expect(BusinessProfileSchema.safeParse({ ...details, location: IVORY_PARK }).success).toBe(false);
    expect(BusinessProfileSchema.safeParse({ ...details, location: { ...IVORY_PARK, accuracyMetres: 20 } }).success).toBe(true);
  });
});
