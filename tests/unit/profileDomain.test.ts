import { describe, expect, it } from "vitest";
import { RULES } from "@/config/rules";
import { destinationFor, isProfileComplete, newAccount, photoPath, type BusinessRecord, type UserRecord } from "@/domain/profile";
import { decideBusinessSave, decideIdClaim, decidePhotoSave, decideWorkerSave } from "@/domain/profileDecisions";
import { decideRole } from "@/domain/roles";

const photo = { path: "photos/u/profile.jpg", version: "1" };
const worker: UserRecord = {
  ...newAccount("thabo", "young_person").user,
  firstName: "Thabo",
  area: "Ivory Park",
  availability: ["saturdays"],
  payoutPhone: "27821234567",
  idLastFour: "0087",
  residency: "citizen",
};
const owner: UserRecord = { role: "business", status: "active" };
const shop: BusinessRecord = {
  ...(newAccount("sipho", "business").business as BusinessRecord),
  name: "Sipho's Phone Repairs",
  area: "Ivory Park",
  openingHours: "Monday to Saturday, 8:00 to 17:00",
};

describe("roles", () => {
  it("are set once: same again is unchanged, a different one is refused", () => {
    expect(decideRole(null, "business")).toEqual({ kind: "create", role: "business" });
    expect(decideRole("business", "business")).toEqual({ kind: "unchanged" });
    expect(decideRole("business", "young_person")).toEqual({ kind: "refuse", current: "business" });
  });
});

describe("ID claims: one ID, one account, set once", () => {
  it("claims a new ID, accepts your own again, refuses someone else's or a second one", () => {
    expect(decideIdClaim("thabo", "h1", null, null)).toEqual({ kind: "claim" });
    expect(decideIdClaim("thabo", "h1", "h1", "thabo")).toEqual({ kind: "already_yours" });
    expect(decideIdClaim("thabo", "h1", null, "lerato")).toMatchObject({ problem: { code: "id_in_use" } });
    expect(decideIdClaim("thabo", "h2", "h1", null)).toMatchObject({ problem: { code: "id_locked" } });
  });
});

describe("completeness and where a person belongs", () => {
  it("needs every young person field and the photo", () => {
    expect(isProfileComplete(worker, null)).toBe(false);
    expect(isProfileComplete({ ...worker, profilePhoto: photo }, null)).toBe(true);
    expect(isProfileComplete({ ...worker, availability: [], profilePhoto: photo }, null)).toBe(false);
  });

  it("needs the business details, the pin and the shopfront photo", () => {
    const pinned = { ...shop, location: { latitude: -26, longitude: 28.2 } };
    expect(isProfileComplete(owner, { ...shop, shopfrontPhoto: photo })).toBe(false);
    expect(isProfileComplete(owner, { ...pinned, shopfrontPhoto: photo })).toBe(true);
  });

  it("sends each person to the right screen", () => {
    expect(destinationFor(false, null, null)).toBe("/sign-in");
    expect(destinationFor(true, null, null)).toBe("/onboarding/role");
    expect(destinationFor(true, worker, null)).toBe("/onboarding/work");
    expect(destinationFor(true, { ...worker, profilePhoto: photo }, null)).toBe("/work");
    expect(destinationFor(true, owner, shop)).toBe("/onboarding/business");
  });

  it("builds photo paths from the uid, never from the browser", () => {
    expect(photoPath("thabo", "profile")).toBe("photos/thabo/profile.jpg");
  });
});

describe("save decisions", () => {
  const save = { details: { firstName: "Thabo", area: "Ivory Park", availability: ["saturdays" as const], payoutPhone: "27821234567" }, idLastFour: "0087", residency: "citizen" as const, idHash: "h1" };

  it("treats an identical worker resend as unchanged, and any change as a save", () => {
    expect(decideWorkerSave("thabo", { user: worker, heldIdHash: "h1", claimOwner: "thabo" }, save)).toEqual({ kind: "unchanged" });
    const changed = decideWorkerSave("thabo", { user: worker, heldIdHash: "h1", claimOwner: "thabo" }, { ...save, details: { ...save.details, area: "Tembisa" } });
    expect(changed).toMatchObject({ kind: "save", next: { claimId: false, user: { area: "Tembisa", completed: 0 } } });
  });

  it("keeps a business pin when a later save has none", () => {
    const pinned = { ...shop, location: { latitude: -26, longitude: 28.2 } };
    const decision = decideBusinessSave(owner, pinned, { name: "Sipho's Repairs", area: "Ivory Park", openingHours: "8:00 to 17:00" });
    expect(decision).toMatchObject({ kind: "save", next: { location: { latitude: -26, longitude: 28.2 } } });
  });

  it("accepts photos just under the size limit and refuses at it", () => {
    const state = { user: worker, business: null };
    const meta = (size: number) => ({ contentType: "image/webp", size, version: "1" });
    expect(decidePhotoSave(state, "profile", photo.path, meta(RULES.photoMaxBytes - 1)).kind).toBe("save");
    expect(decidePhotoSave(state, "profile", photo.path, meta(RULES.photoMaxBytes))).toMatchObject({ problem: { code: "photo_too_big" } });
    expect(decidePhotoSave(state, "shopfront", photo.path, meta(1))).toMatchObject({ problem: { code: "role_locked" } });
  });
});
