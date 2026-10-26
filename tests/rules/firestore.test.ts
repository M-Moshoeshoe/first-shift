import { readFileSync } from "node:fs";
import { assertFails, assertSucceeds, initializeTestEnvironment, type RulesTestEnvironment } from "@firebase/rules-unit-testing";
import { collection, deleteDoc, doc, getDoc, getDocs, query, setDoc, updateDoc, where } from "firebase/firestore";
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
    await setDoc(doc(db, "users/sipho"), { role: "business", status: "active" });
    await setDoc(doc(db, "businesses/sipho-shop"), { ownerId: "sipho", name: "Sipho's Phone Repairs" });
    await setDoc(doc(db, "idHashes/hash-of-thabos-id"), { uid: "thabo" });
    await setDoc(doc(db, "auditLog/entry-1"), { uid: "thabo", action: "role_set" });
    await setDoc(doc(db, "tryouts/live"), { status: "published", ownerId: "sipho" });
    await setDoc(doc(db, "tryouts/draft"), { status: "draft", ownerId: "sipho" });
    await setDoc(doc(db, "tryouts/in-review"), { status: "review", ownerId: "sipho", businessName: "Sipho's Phone Repairs" });
    await setDoc(doc(db, "applications/a1"), { workerId: "thabo", ownerId: "sipho" });
    await setDoc(doc(db, "bookings/b1"), { workerId: "thabo", ownerId: "sipho" });
    await setDoc(doc(db, "payments/p1"), { workerId: "thabo", ownerId: "sipho" });
    await setDoc(doc(db, "references/r1"), { workerId: "thabo", ownerId: "sipho" });
    await setDoc(doc(db, "demoAccounts/young_person"), { uid: "demo-thabo", email: "thabo@firstshift.demo", salt: "00", hash: "00" });
    await setDoc(doc(db, "creditLedger/sipho_000001"), { businessId: "sipho", seq: 1, kind: "grant", amount: 3, reason: "welcome" });
  });
});

const as = (uid: string, claims: { demo?: boolean } = {}) => env.authenticatedContext(uid, claims).firestore();
const anonymous = () => env.unauthenticatedContext().firestore();

describe("profile data written only by the server (Phase 1)", () => {
  it("never lets a client read ID hashes or the audit log, not even its own entries", async () => {
    for (const reader of [as("thabo"), as("sipho"), anonymous()]) {
      await assertFails(getDoc(doc(reader, "idHashes/hash-of-thabos-id")));
      await assertFails(getDoc(doc(reader, "auditLog/entry-1")));
      await assertFails(getDocs(query(collection(reader, "idHashes"), where("uid", "==", "thabo"))));
      await assertFails(getDocs(query(collection(reader, "auditLog"), where("uid", "==", "thabo"))));
    }
  });

  it("never lets a client create, change or delete a user or business record, even its own", async () => {
    await assertFails(setDoc(doc(as("ayanda"), "users/ayanda"), { role: "young_person", status: "active" }));
    await assertFails(updateDoc(doc(as("thabo"), "users/thabo"), { completed: 99 }));
    await assertFails(deleteDoc(doc(as("thabo"), "users/thabo")));
    await assertFails(setDoc(doc(as("sipho"), "businesses/sipho"), { ownerId: "sipho", name: "Sipho's Phone Repairs" }));
    await assertFails(updateDoc(doc(as("sipho"), "businesses/sipho-shop"), { name: "Changed" }));
    await assertFails(setDoc(doc(as("thabo"), "idHashes/made-up"), { uid: "thabo" }));
    await assertFails(setDoc(doc(as("thabo"), "auditLog/made-up"), { uid: "thabo", action: "role_set" }));
  });

  it("lets each person read only their own user record", async () => {
    await assertSucceeds(getDoc(doc(as("thabo"), "users/thabo")));
    await assertSucceeds(getDoc(doc(as("sipho"), "users/sipho")));
    await assertFails(getDoc(doc(as("thabo"), "users/sipho")));
    await assertFails(getDoc(doc(as("sipho"), "users/thabo")));
    await assertFails(getDocs(collection(as("thabo"), "users")));
  });
});

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

  it("lets only the owner read a tryout, even a published one: everyone else gets tryouts from the server", async () => {
    await assertSucceeds(getDoc(doc(as("sipho"), "tryouts/live")));
    await assertSucceeds(getDoc(doc(as("sipho"), "tryouts/draft")));
    await assertSucceeds(getDocs(query(collection(as("sipho"), "tryouts"), where("ownerId", "==", "sipho"))));
    for (const reader of [as("thabo"), as("demo-thabo", { demo: true }), anonymous()]) {
      await assertFails(getDoc(doc(reader, "tryouts/live")));
      await assertFails(getDoc(doc(reader, "tryouts/draft")));
      await assertFails(getDocs(query(collection(reader, "tryouts"), where("status", "==", "published"))));
    }
  });

  it("keeps the demo accounts' password hashes server-only, even from the demo accounts", async () => {
    for (const client of [as("demo-thabo", { demo: true }), as("thabo"), anonymous()]) {
      await assertFails(getDoc(doc(client, "demoAccounts/young_person")));
      await assertFails(getDocs(collection(client, "demoAccounts")));
      await assertFails(setDoc(doc(client, "demoAccounts/young_person"), { uid: "demo-thabo", email: "thabo@firstshift.demo" }));
    }
  });

  it("shows a tryout waiting for review only to its owner (Phase 2)", async () => {
    await assertSucceeds(getDoc(doc(as("sipho"), "tryouts/in-review")));
    await assertFails(getDoc(doc(as("thabo"), "tryouts/in-review")));
    await assertFails(getDoc(doc(anonymous(), "tryouts/in-review")));
  });

  it("never lets a client create, change or delete a tryout, not even the owner (Phase 2)", async () => {
    for (const writer of [as("sipho"), as("thabo")]) {
      await assertFails(setDoc(doc(writer, "tryouts/new"), { status: "published", ownerId: "sipho" }));
      await assertFails(updateDoc(doc(writer, "tryouts/live"), { status: "withdrawn" }));
      await assertFails(updateDoc(doc(writer, "tryouts/in-review"), { status: "published" }));
      await assertFails(deleteDoc(doc(writer, "tryouts/live")));
    }
  });

  it("keeps the credit ledger server-only: no client reads it or writes it, not even its own business", async () => {
    for (const client of [as("sipho"), as("thabo"), anonymous()]) {
      await assertFails(getDoc(doc(client, "creditLedger/sipho_000001")));
      await assertFails(getDocs(query(collection(client, "creditLedger"), where("businessId", "==", "sipho"))));
      await assertFails(setDoc(doc(client, "creditLedger/sipho_000002"), { businessId: "sipho", seq: 2, kind: "grant", amount: 100, reason: "top_up" }));
      await assertFails(updateDoc(doc(client, "creditLedger/sipho_000001"), { amount: 100 }));
      await assertFails(deleteDoc(doc(client, "creditLedger/sipho_000001")));
    }
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

describe("applications and bookings, written only by the server (Phases 3 and 4)", () => {
  it("lets only the applicant and the tryout's owner read an application, and no client write one (Phase 3)", async () => {
    await assertSucceeds(getDoc(doc(as("thabo"), "applications/a1")));
    await assertSucceeds(getDoc(doc(as("sipho"), "applications/a1")));
    await assertSucceeds(getDocs(query(collection(as("sipho"), "applications"), where("ownerId", "==", "sipho"))));
    for (const reader of [as("lerato"), as("demo-thabo", { demo: true }), anonymous()]) {
      await assertFails(getDoc(doc(reader, "applications/a1")));
      await assertFails(getDocs(query(collection(reader, "applications"), where("ownerId", "==", "sipho"))));
    }
    for (const writer of [as("thabo"), as("sipho")]) {
      await assertFails(setDoc(doc(writer, "applications/t1_thabo"), { workerId: "thabo", ownerId: "sipho", status: "applied" }));
      await assertFails(updateDoc(doc(writer, "applications/a1"), { status: "withdrawn" }));
      await assertFails(deleteDoc(doc(writer, "applications/a1")));
    }
  });

  it("lets only a booking's two parties read it, keeps its secrets and the status page server-only, and lets no client write (Phase 4)", async () => {
    await env.withSecurityRulesDisabled(async (context) => {
      const db = context.firestore();
      await setDoc(doc(db, "bookingSecrets/b1"), { bookingId: "b1", checkInCode: "123456", shareToken: "token-abcdefghijklmnop" });
      await setDoc(doc(db, "cases/c1"), { kind: "report", category: "harassment", reporterId: "thabo", businessId: "sipho" });
      await setDoc(doc(db, "strikes/s1"), { uid: "thabo", reason: "late_cancellation" });
    });
    await assertSucceeds(getDoc(doc(as("thabo"), "bookings/b1")));
    await assertSucceeds(getDoc(doc(as("sipho"), "bookings/b1")));
    for (const reader of [as("lerato"), as("demo-thabo", { demo: true }), anonymous()]) await assertFails(getDoc(doc(reader, "bookings/b1")));
    for (const client of [as("thabo"), as("sipho"), anonymous()]) {
      await assertFails(getDoc(doc(client, "bookingSecrets/b1")));
      await assertFails(getDocs(query(collection(client, "bookingSecrets"), where("shareToken", "==", "token-abcdefghijklmnop"))));
      await assertFails(getDoc(doc(client, "cases/c1")));
      await assertFails(getDoc(doc(client, "strikes/s1")));
      await assertFails(setDoc(doc(client, "bookings/b2"), { workerId: "thabo", ownerId: "sipho", status: "booked" }));
      await assertFails(updateDoc(doc(client, "bookings/b1"), { status: "cancelled" }));
      await assertFails(setDoc(doc(client, "cases/c2"), { kind: "report", reporterId: "thabo" }));
    }
  });

  it("keeps proof added after Not received server-only: neither party reads its own or the other's, and no client writes it", async () => {
    await env.withSecurityRulesDisabled(async (context) => {
      await setDoc(doc(context.firestore(), "evidence/e1"), { bookingId: "b1", party: "young_person", uid: "thabo", path: "evidence/b1/young_person-x", note: "My balance at 18:00" });
    });
    for (const client of [as("thabo"), as("sipho"), as("lerato"), anonymous()]) {
      await assertFails(getDoc(doc(client, "evidence/e1")));
      await assertFails(getDocs(query(collection(client, "evidence"), where("bookingId", "==", "b1"))));
      await assertFails(setDoc(doc(client, "evidence/e2"), { bookingId: "b1", party: "business", uid: "sipho" }));
      await assertFails(updateDoc(doc(client, "evidence/e1"), { note: "changed" }));
    }
  });

  it("keeps references and job offers server-only: written by the server, read through it, never by a client (Phase 6)", async () => {
    await env.withSecurityRulesDisabled(async (context) => {
      await setDoc(doc(context.firestore(), "hireOffers/sipho_thabo"), { ownerId: "sipho", workerId: "thabo", businessName: "Sipho's Phone Repairs" });
    });
    for (const client of [as("thabo"), as("sipho"), anonymous()]) {
      await assertFails(getDoc(doc(client, "hireOffers/sipho_thabo")));
      await assertFails(getDocs(query(collection(client, "hireOffers"), where("workerId", "==", "thabo"))));
      await assertFails(setDoc(doc(client, "hireOffers/sipho_lerato"), { ownerId: "sipho", workerId: "lerato" }));
      await assertFails(updateDoc(doc(client, "references/r1"), { status: "approved", text: "Rewritten" }));
      await assertFails(setDoc(doc(client, "references/r2"), { workerId: "thabo", ownerId: "sipho", status: "approved" }));
    }
  });
});
