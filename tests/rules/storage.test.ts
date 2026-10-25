import { readFileSync } from "node:fs";
import { assertFails, assertSucceeds, initializeTestEnvironment, type RulesTestEnvironment } from "@firebase/rules-unit-testing";
import { afterAll, beforeAll, beforeEach, describe, it } from "vitest";

/*
 * storage.rules: the one documented client write. Photos go only into your
 * own folder, only as images, only under 2 MB. The photo route then checks
 * the file again on the server before it counts (AGENTS.md).
 */
let env: RulesTestEnvironment;

beforeAll(async () => {
  env = await initializeTestEnvironment({
    projectId: "demo-first-shift",
    storage: { rules: readFileSync("storage.rules", "utf8") },
  });
});

afterAll(async () => env.cleanup());
beforeEach(async () => env.clearStorage());

const TWO_MB = 2 * 1024 * 1024;
const JPEG = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01, 0xff, 0xd9]);

/** Uploads as the given person (or signed out) through the browser SDK, as the onboarding forms do. */
function upload(uid: string | null, path: string, bytes: Uint8Array, contentType: string, claims: { demo?: boolean } = {}): Promise<unknown> {
  const storage = uid ? env.authenticatedContext(uid, claims).storage() : env.unauthenticatedContext().storage();
  return Promise.resolve(storage.ref(path).put(bytes, { contentType }));
}

describe("photo uploads", () => {
  it("lets a person upload an image to their own folder", async () => {
    await assertSucceeds(upload("thabo", "photos/thabo/profile.jpg", JPEG, "image/jpeg"));
    await assertSucceeds(upload("sipho", "photos/sipho/shopfront.jpg", JPEG, "image/webp"));
  });

  it("refuses an upload into another person's folder", async () => {
    await assertFails(upload("thabo", "photos/lerato/profile.jpg", JPEG, "image/jpeg"));
  });

  it("refuses a file that isn't an image", async () => {
    await assertFails(upload("thabo", "photos/thabo/profile.jpg", new TextEncoder().encode("<html>not a photo</html>"), "text/html"));
    await assertFails(upload("thabo", "photos/thabo/profile.jpg", JPEG, "application/pdf"));
  });

  it("refuses a file of 2 MB or more", async () => {
    await assertFails(upload("thabo", "photos/thabo/profile.jpg", new Uint8Array(TWO_MB + 1), "image/jpeg"));
    await assertFails(upload("thabo", "photos/thabo/profile.jpg", new Uint8Array(TWO_MB), "image/jpeg"));
  });

  it("lets a person read only their own photos: anyone else's comes through the server", async () => {
    await env.withSecurityRulesDisabled(async (context) => {
      await context.storage().ref("photos/thabo/profile.jpg").put(JPEG, { contentType: "image/jpeg" });
    });
    await assertSucceeds(Promise.resolve(env.authenticatedContext("thabo").storage().ref("photos/thabo/profile.jpg").getMetadata()));
    await assertFails(Promise.resolve(env.authenticatedContext("sipho").storage().ref("photos/thabo/profile.jpg").getMetadata()));
    await assertFails(Promise.resolve(env.authenticatedContext("demo-sipho", { demo: true }).storage().ref("photos/thabo/profile.jpg").getMetadata()));
    await assertFails(Promise.resolve(env.unauthenticatedContext().storage().ref("photos/thabo/profile.jpg").getMetadata()));
  });

  it("refuses any upload from a demo account, even an image into its own folder", async () => {
    await assertFails(upload("demo-thabo", "photos/demo-thabo/profile.jpg", JPEG, "image/jpeg", { demo: true }));
    await assertSucceeds(upload("thabo", "photos/thabo/profile.jpg", JPEG, "image/jpeg", { demo: false }));
  });

  it("refuses signed-out uploads and anything outside the photos folders", async () => {
    await assertFails(upload(null, "photos/thabo/profile.jpg", JPEG, "image/jpeg"));
    await assertFails(upload("thabo", "thabo/profile.jpg", JPEG, "image/jpeg"));
  });

  it("keeps proof screenshots private: only the server writes them and only an admin reads them", async () => {
    await env.withSecurityRulesDisabled(async (context) => {
      await context.storage().ref("evidence/b1/young_person-x").put(JPEG, { contentType: "image/jpeg" });
    });
    for (const uid of ["thabo", "sipho"]) {
      await assertFails(upload(uid, "evidence/b1/young_person-y", JPEG, "image/jpeg"));
      await assertFails(Promise.resolve(env.authenticatedContext(uid).storage().ref("evidence/b1/young_person-x").getDownloadURL()));
    }
    await assertFails(Promise.resolve(env.unauthenticatedContext().storage().ref("evidence/b1/young_person-x").getDownloadURL()));
  });
});
