import { describe, expect, it } from "vitest";
import { FIELD_MESSAGES } from "@/domain/messages";
import { displayPhone, newAccount, profileView, type UserRecord } from "@/domain/profile";
import { fieldErrors, firstInvalid } from "@/lib/forms";
import { fitWithin } from "@/lib/imageResize";
import { PHOTO_MAX_EDGE_PX } from "@/lib/photos";
import { ProfileViewSchema, WorkerDetailsSchema } from "@/schemas/profile";
import { createFakeStore, fakeService, real, workerInput } from "./support/profileFakes";

describe("photo resizing", () => {
  it("fits a 4000 x 3000 phone photo inside 1024 px, keeping its shape", () => {
    expect(fitWithin(4000, 3000, PHOTO_MAX_EDGE_PX)).toEqual({ width: 1024, height: 768 });
    expect(fitWithin(3000, 4000, PHOTO_MAX_EDGE_PX)).toEqual({ width: 768, height: 1024 });
  });

  it("never scales a small photo up", () => {
    expect(fitWithin(640, 480, PHOTO_MAX_EDGE_PX)).toEqual({ width: 640, height: 480 });
  });
});

describe("form errors", () => {
  const FIELDS = ["firstName", "area", "availability", "payoutPhone", "payMethods"] as const;

  it("keeps one message per field and finds the first invalid one in screen order", () => {
    const parsed = WorkerDetailsSchema.safeParse({ firstName: "", area: "Tembisa", availability: [], payoutPhone: "123", payMethods: [] });
    if (parsed.success) throw new Error("expected errors");
    const errors = fieldErrors(parsed.error, FIELDS);
    expect(errors).toEqual({ firstName: FIELD_MESSAGES.firstNameEmpty, availability: FIELD_MESSAGES.availability, payoutPhone: FIELD_MESSAGES.payoutPhone, payMethods: FIELD_MESSAGES.payMethods });
    expect(firstInvalid(errors, FIELDS)).toBe("firstName");
    expect(firstInvalid({ payoutPhone: "x" }, FIELDS)).toBe("payoutPhone");
    expect(firstInvalid({}, FIELDS)).toBeNull();
  });
});

describe("the person's own profile view", () => {
  it("shows the phone as it's typed and never the counters, hash or photo path", () => {
    expect(displayPhone("27821234567")).toBe("082 123 4567");
    const user: UserRecord = { ...newAccount("thabo", "young_person").user, firstName: "Thabo", payoutPhone: "27821234567", idLastFour: "0087", profilePhoto: { path: "photos/thabo/profile.jpg", version: "3" } };
    const view = profileView(user, null);
    expect(view.worker).toMatchObject({ firstName: "Thabo", payoutPhone: "082 123 4567", idLastFour: "0087", hasPhoto: true });
    expect(JSON.stringify(view)).not.toMatch(/completed|photos\/|version/);
    expect(ProfileViewSchema.safeParse(view).success).toBe(true);
  });

  it("is read through the service without writing or auditing anything", async () => {
    const store = createFakeStore();
    const service = fakeService(store);
    expect(await service.getProfile("nobody")).toMatchObject({ role: null, destination: "/onboarding/role" });
    await service.setRole(real("thabo"), "young_person");
    await service.saveWorker(real("thabo"), workerInput());
    const before = store.snapshot();
    expect(await service.getProfile("thabo")).toMatchObject({ role: "young_person", complete: false, destination: "/onboarding/work", worker: { idLastFour: "0087", hasPhoto: false } });
    expect(store.snapshot()).toBe(before);
  });
});
