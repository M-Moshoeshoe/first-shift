import { describe, expect, it } from "vitest";
import { DESTINATIONS, destinationFor, isDestination, newAccount, redirectFor, type UserRecord } from "@/domain/profile";

const photo = { path: "photos/u/profile.jpg", version: "1" };
const finishedWorker: UserRecord = {
  ...newAccount("thabo", "young_person").user,
  firstName: "Thabo",
  area: "Ivory Park",
  availability: ["saturdays"],
  payoutPhone: "27821234567",
  idLastFour: "0087",
  profilePhoto: photo,
};

describe("every account screen is open only while it's the person's destination", () => {
  it("lets people stay where they belong", () => {
    for (const destination of DESTINATIONS) expect(redirectFor(destination, destination)).toBeNull();
  });

  it("sends signed-out visitors to sign in from every guarded screen", () => {
    const signedOut = destinationFor(false, null, null);
    for (const path of ["/work", "/business", "/onboarding/role", "/onboarding/work", "/onboarding/business"] as const) {
      expect(redirectFor(path, signedOut)).toBe("/sign-in");
    }
  });

  it("sends someone with no role to the role choice, and an unfinished young person to their form", () => {
    expect(redirectFor("/work", destinationFor(true, null, null))).toBe("/onboarding/role");
    const unfinished = newAccount("thabo", "young_person").user;
    expect(redirectFor("/work", destinationFor(true, unfinished, null))).toBe("/onboarding/work");
    expect(redirectFor("/onboarding/role", destinationFor(true, unfinished, null))).toBe("/onboarding/work");
  });

  it("keeps a finished young person out of onboarding and out of the business screens", () => {
    const destination = destinationFor(true, finishedWorker, null);
    expect(redirectFor("/onboarding/work", destination)).toBe("/work");
    expect(redirectFor("/business", destination)).toBe("/work");
    expect(redirectFor("/onboarding/business", destination)).toBe("/work");
  });

  it("sends a signed-in person away from sign in to where they belong", () => {
    expect(redirectFor("/sign-in", destinationFor(true, finishedWorker, null))).toBe("/work");
  });

  it("opens a finished business's own screens, and nobody else's", () => {
    expect(redirectFor("/business/post", "/business")).toBeNull();
    expect(redirectFor("/business/post", "/work")).toBe("/work");
    expect(redirectFor("/business/post", "/onboarding/business")).toBe("/onboarding/business");
    expect(redirectFor("/business/anything-else", "/business")).toBe("/business");
    expect(redirectFor("/business/post/../admin", "/business")).toBe("/business");
  });

  it("only treats known screens as destinations", () => {
    expect(isDestination("/work")).toBe(true);
    expect(isDestination("/work/../admin")).toBe(false);
    expect(isDestination("/")).toBe(false);
  });
});
