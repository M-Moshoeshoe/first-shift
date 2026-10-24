import { readFileSync } from "node:fs";
import { assertFails, assertSucceeds, initializeTestEnvironment, type RulesTestEnvironment } from "@firebase/rules-unit-testing";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { afterAll, beforeAll, beforeEach, describe, it } from "vitest";

let env: RulesTestEnvironment;

beforeAll(async () => {
  env = await initializeTestEnvironment({
    projectId: "demo-first-shift",
    firestore: { rules: readFileSync("firestore.rules", "utf8") },
  });
});

afterAll(async () => env.cleanup());

beforeEach(async () => {
  await env.clearFirestore();
  await env.withSecurityRulesDisabled(async (context) => {
    const db = context.firestore();
    await setDoc(doc(db, "users/thabo"), { firstName: "Thabo" });
    await setDoc(doc(db, "businesses/sipho-shop"), { ownerId: "sipho", name: "Sipho's Phone Repairs" });
    await setDoc(doc(db, "tryouts/live"), { status: "published", ownerId: "sipho" });
    await setDoc(doc(db, "tryouts/draft"), { status: "draft", ownerId: "sipho" });
    await setDoc(doc(db, "applications/a1"), { workerId: "thabo", ownerId: "sipho" });
    await setDoc(doc(db, "bookings/b1"), { workerId: "thabo", ownerId: "sipho" });
    await setDoc(doc(db, "payments/p1"), { workerId: "thabo", ownerId: "sipho" });
    await setDoc(doc(db, "references/r1"), { workerId: "thabo", ownerId: "sipho" });
  });
});

const as = (uid: string) => env.authenticatedContext(uid).firestore();
const anonymous = () => env.unauthenticatedContext().firestore();

describe("deny by default", () => {
  it("blocks every read for signed-out visitors", async () => {
    await assertFails(getDoc(doc(anonymous(), "tryouts/live")));
    await assertFails(getDoc(doc(anonymous(), "users/thabo")));
  });

  it("blocks every client write, even to your own profile", async () => {
    await assertFails(setDoc(doc(as("thabo"), "users/thabo"), { firstName: "Changed" }));
    await assertFails(setDoc(doc(as("sipho"), "tryouts/new"), { status: "published", ownerId: "sipho" }));
  });

  it("never lets a client read references directly", async () => {
    await assertFails(getDoc(doc(as("thabo"), "references/r1")));
  });
});

describe("reads", () => {
  it("lets people read only their own profile", async () => {
    await assertSucceeds(getDoc(doc(as("thabo"), "users/thabo")));
    await assertFails(getDoc(doc(as("sipho"), "users/thabo")));
  });

  it("shows published tryouts to signed-in users, and drafts only to the owner", async () => {
    await assertSucceeds(getDoc(doc(as("thabo"), "tryouts/live")));
    await assertFails(getDoc(doc(as("thabo"), "tryouts/draft")));
    await assertSucceeds(getDoc(doc(as("sipho"), "tryouts/draft")));
  });

  it("limits applications, bookings and payments to the two people involved", async () => {
    for (const path of ["applications/a1", "bookings/b1", "payments/p1"]) {
      await assertSucceeds(getDoc(doc(as("thabo"), path)));
      await assertSucceeds(getDoc(doc(as("sipho"), path)));
      await assertFails(getDoc(doc(as("stranger"), path)));
    }
  });

  it("keeps a business record private to its owner", async () => {
    await assertSucceeds(getDoc(doc(as("sipho"), "businesses/sipho-shop")));
    await assertFails(getDoc(doc(as("thabo"), "businesses/sipho-shop")));
  });
});
