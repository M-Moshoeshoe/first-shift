import { beforeEach, describe, expect, it, vi } from "vitest";
import { RULES } from "@/config/rules";
import { ID_PROBLEM_MESSAGES, PROFILE_MESSAGES } from "@/domain/messages";
import { AppError } from "@/server/errors";
import { ADULT_ID, BAD_IDS, OTHER_ADULT_ID, createFakeStore, fakeService, testHash, workerInput, type FakeStore } from "./support/profileFakes";

let store: FakeStore;
let service: ReturnType<typeof fakeService>;

beforeEach(() => {
  store = createFakeStore();
  service = fakeService(store);
});

/** Runs a call that must be refused, and proves it changed nothing at all. */
async function expectRefusedWithoutChange(call: () => Promise<unknown>, message: string) {
  const before = store.snapshot();
  const error = await call().then(() => null, (caught: unknown) => caught);
  expect(error).toBeInstanceOf(AppError);
  expect((error as AppError).publicMessage).toBe(message);
  expect(store.snapshot()).toBe(before);
}

describe("role", () => {
  it("creates a young person with counters at 0 and status active, and audits it", async () => {
    expect(await service.setRole("thabo", "young_person")).toEqual({ status: "saved", complete: false });
    expect(store.users.get("thabo")).toEqual({ role: "young_person", status: "active", completed: 0, onTime: 0, lateCancellations: 0, noShows: 0 });
    expect(store.audit).toEqual([{ uid: "thabo", action: "role_set" }]);
  });

  it("creates the business record with the business role, counters on the business", async () => {
    await service.setRole("sipho", "business");
    expect(store.users.get("sipho")).toEqual({ role: "business", status: "active" });
    expect(store.businesses.get("sipho")).toMatchObject({ ownerId: "sipho", status: "active", completed: 0, noShows: 0 });
  });

  it("is idempotent: the same role twice writes once and audits once", async () => {
    await service.setRole("thabo", "young_person");
    const before = store.snapshot();
    expect(await service.setRole("thabo", "young_person")).toEqual({ status: "unchanged", complete: false });
    expect(store.snapshot()).toBe(before);
    expect(store.audit).toHaveLength(1);
  });

  it("never changes a role once set", async () => {
    await service.setRole("thabo", "young_person");
    await expectRefusedWithoutChange(() => service.setRole("thabo", "business"), PROFILE_MESSAGES.roleLocked.young_person);
  });
});

describe("young person profile", () => {
  beforeEach(async () => {
    await service.setRole("thabo", "young_person");
  });

  it("stores only the hash, the last four digits and the residency type", async () => {
    expect(await service.saveWorker("thabo", workerInput())).toEqual({ status: "saved", complete: false });
    expect(store.users.get("thabo")).toMatchObject({ firstName: "Thabo", payoutPhone: "27821234567", idLastFour: "0087", residency: "citizen" });
    expect(store.idHashes.get(testHash(ADULT_ID))).toBe("thabo");
    expect(store.audit.at(-1)).toEqual({ uid: "thabo", action: "worker_profile_saved" });
    const stored = store.snapshot();
    for (const secret of [ADULT_ID, "2000-01-15", "000115"]) expect(stored).not.toContain(secret);
  });

  it("is idempotent: an identical resend changes nothing and adds no audit entry", async () => {
    await service.saveWorker("thabo", workerInput());
    const before = store.snapshot();
    expect(await service.saveWorker("thabo", workerInput())).toEqual({ status: "unchanged", complete: false });
    expect(store.snapshot()).toBe(before);
    expect(store.idHashes.size).toBe(1);
  });

  it("saves a changed detail with the same ID once, without a second claim or reset counters", async () => {
    await service.saveWorker("thabo", workerInput());
    const saved = store.users.get("thabo");
    if (!saved) throw new Error("expected Thabo's record");
    store.users.set("thabo", { ...saved, completed: 3, onTime: 3 });
    expect(await service.saveWorker("thabo", workerInput({ area: "Tembisa" }))).toMatchObject({ status: "saved" });
    expect(store.users.get("thabo")).toMatchObject({ area: "Tembisa", completed: 3, onTime: 3 });
    expect(store.idHashes.size).toBe(1);
    expect(store.audit.filter((entry) => entry.action === "worker_profile_saved")).toHaveLength(2);
  });

  it("refuses a different ID on an account that already has one", async () => {
    await service.saveWorker("thabo", workerInput());
    await expectRefusedWithoutChange(() => service.saveWorker("thabo", workerInput({ idNumber: OTHER_ADULT_ID })), PROFILE_MESSAGES.idLocked);
  });

  it("refuses an ID that belongs to another account, and stores nothing for the second account", async () => {
    await service.saveWorker("thabo", workerInput());
    await service.setRole("lerato", "young_person");
    await expectRefusedWithoutChange(() => service.saveWorker("lerato", workerInput({ firstName: "Lerato" })), PROFILE_MESSAGES.idInUse);
  });

  it.each(Object.entries(BAD_IDS))("refuses a %s ID before hashing it, and stores nothing", async (problem, idNumber) => {
    const hashId = vi.fn(testHash);
    service = fakeService(store, hashId);
    await expectRefusedWithoutChange(() => service.saveWorker("thabo", workerInput({ idNumber })), ID_PROBLEM_MESSAGES[problem as keyof typeof BAD_IDS]);
    expect(hashId).not.toHaveBeenCalled();
  });

  it("needs the young person role", async () => {
    await expectRefusedWithoutChange(() => service.saveWorker("nobody", workerInput()), PROFILE_MESSAGES.roleMissing);
    await service.setRole("sipho", "business");
    await expectRefusedWithoutChange(() => service.saveWorker("sipho", workerInput()), PROFILE_MESSAGES.roleLocked.business);
  });
});

describe("business profile", () => {
  const details = { name: "Sipho's Phone Repairs", area: "Ivory Park", openingHours: "Monday to Saturday, 8:00 to 17:00" };
  const pin = { latitude: -25.99, longitude: 28.23, accuracyMetres: 20 };

  beforeEach(async () => {
    await service.setRole("sipho", "business");
  });

  it("saves without a pin, keeps a pin once set, and resends idempotently", async () => {
    expect(await service.saveBusiness("sipho", details)).toEqual({ status: "saved", complete: false });
    await service.saveBusiness("sipho", { ...details, location: pin });
    expect(await service.saveBusiness("sipho", details)).toEqual({ status: "unchanged", complete: false });
    expect(store.businesses.get("sipho")?.location).toEqual(pin);
    expect(store.audit.filter((entry) => entry.action === "business_profile_saved")).toHaveLength(2);
  });

  it("needs the business role", async () => {
    await service.setRole("thabo", "young_person");
    await expectRefusedWithoutChange(() => service.saveBusiness("thabo", details), PROFILE_MESSAGES.roleLocked.young_person);
  });

  it(`grants ${RULES.freeCredits} free credits with the save that completes the profile, once, each with an audit entry`, async () => {
    await service.saveBusiness("sipho", { ...details, location: pin });
    expect(store.ledgers.get("sipho")).toBeUndefined();
    store.photos.set("photos/sipho/shopfront.jpg", { contentType: "image/jpeg", size: 200_000, version: "1" });
    expect(await service.savePhoto("sipho", "shopfront")).toEqual({ status: "saved", complete: true });
    expect(store.ledgers.get("sipho")).toEqual([{ kind: "grant", amount: RULES.freeCredits, reason: "welcome" }]);
    // A changed detail and a new photo later: still one grant.
    await service.saveBusiness("sipho", { ...details, name: "Sipho's Repairs", location: pin });
    store.photos.set("photos/sipho/shopfront.jpg", { contentType: "image/jpeg", size: 200_000, version: "2" });
    await service.savePhoto("sipho", "shopfront");
    expect(store.ledgers.get("sipho")).toHaveLength(1);
    expect(store.audit.filter((entry) => entry.action === "credit_grant")).toHaveLength(1);
    expect((await service.getProfile("sipho")).business?.credits).toEqual({ available: RULES.freeCredits, onlyFree: true });
  });

  it("grants nothing to a young person", async () => {
    await service.setRole("thabo", "young_person");
    await service.saveWorker("thabo", workerInput());
    store.photos.set("photos/thabo/profile.jpg", { contentType: "image/jpeg", size: 180_000, version: "1" });
    await service.savePhoto("thabo", "profile");
    expect(store.ledgers.get("thabo")).toBeUndefined();
  });
});

describe("photos", () => {
  const meta = (overrides = {}) => ({ contentType: "image/jpeg", size: 180_000, version: "1", ...overrides });

  beforeEach(async () => {
    await service.setRole("thabo", "young_person");
  });

  it("asks for details first, then checks what Storage actually holds", async () => {
    await expectRefusedWithoutChange(() => service.savePhoto("thabo", "profile"), PROFILE_MESSAGES.detailsFirst);
    await service.saveWorker("thabo", workerInput());
    await expectRefusedWithoutChange(() => service.savePhoto("thabo", "profile"), PROFILE_MESSAGES.photoMissing("profile"));
    store.photos.set("photos/thabo/profile.jpg", meta({ contentType: "text/html" }));
    await expectRefusedWithoutChange(() => service.savePhoto("thabo", "profile"), PROFILE_MESSAGES.photoWrongType);
    store.photos.set("photos/thabo/profile.jpg", meta({ size: RULES.photoMaxBytes }));
    await expectRefusedWithoutChange(() => service.savePhoto("thabo", "profile"), PROFILE_MESSAGES.photoTooBig);
  });

  it("saves the server-built path, completes the profile, and treats the same file as unchanged", async () => {
    await service.saveWorker("thabo", workerInput());
    store.photos.set("photos/thabo/profile.jpg", meta());
    expect(await service.savePhoto("thabo", "profile")).toEqual({ status: "saved", complete: true });
    expect(store.users.get("thabo")?.profilePhoto).toEqual({ path: "photos/thabo/profile.jpg", version: "1" });
    expect(await service.savePhoto("thabo", "profile")).toEqual({ status: "unchanged", complete: true });
    store.photos.set("photos/thabo/profile.jpg", meta({ version: "2" }));
    expect(await service.savePhoto("thabo", "profile")).toMatchObject({ status: "saved" });
    expect(store.audit.filter((entry) => entry.action === "photo_saved")).toHaveLength(2);
    // Role, profile and two photos later: every audit entry still says only who and what.
    expect(store.audit.map((entry) => entry.action)).toEqual(["role_set", "worker_profile_saved", "photo_saved", "photo_saved"]);
    for (const entry of store.audit) expect(Object.keys(entry).sort()).toEqual(["action", "uid"]);
  });
});
