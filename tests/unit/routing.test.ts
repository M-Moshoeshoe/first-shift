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
    expect(redirectFor("/work/tryouts/abc_123-X", "/work")).toBeNull();
    expect(redirectFor("/work/tryouts/abc_123-X", "/business")).toBe("/business");
    expect(redirectFor("/work/tryouts/abc_123-X", "/onboarding/work")).toBe("/onboarding/work");
    expect(redirectFor("/work/tryouts/", "/work")).toBe("/work");
    expect(redirectFor("/work/tryouts/a/b", "/work")).toBe("/work");
    expect(redirectFor("/work/tryouts/a.b", "/work")).toBe("/work");
    expect(redirectFor("/work/applications", "/work")).toBeNull();
    expect(redirectFor("/work/applications", "/business")).toBe("/business");
    expect(redirectFor("/business/tryouts/t1", "/business")).toBeNull();
    expect(redirectFor("/business/tryouts/t1", "/work")).toBe("/work");
    // Both parties open the same booking page; the server shows each only their side.
    expect(redirectFor("/bookings/b1", "/work")).toBeNull();
    expect(redirectFor("/bookings/b1", "/business")).toBeNull();
    expect(redirectFor("/bookings/b1", "/onboarding/work")).toBe("/onboarding/work");
  });

  it("only treats known screens as destinations", () => {
    expect(isDestination("/work")).toBe(true);
    expect(isDestination("/work/../admin")).toBe(false);
    expect(isDestination("/")).toBe(false);
  });
});
