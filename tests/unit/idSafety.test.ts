import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { POST as postRole } from "@/app/api/profile/role/route";
import { POST as postWorker } from "@/app/api/profile/worker/route";
import { hashIdNumber } from "@/server/idHash";
import { ADULT_ID, BAD_IDS, OTHER_ADULT_ID, createFakeStore, workerInput, type FakeStore } from "./support/profileFakes";

/*
 * The full ID number must never leave the request: not in a log line, not in
 * an error message, not in a response. Each test sends a real-looking ID down
 * a failure path through the actual route handlers, captures everything
 * written to the console and stdout plus the response body, and searches it.
 */

const ctx = vi.hoisted(() => ({ uid: "thabo", store: null as FakeStore | null, hashId: null as ((digits: string) => string) | null }));

vi.mock("@/server/auth", () => ({ requireUser: async () => ({ uid: ctx.uid }) }));
vi.mock("@/server/services/liveProfileService", async () => {
  const fakes = await import("./support/profileFakes");
  return {
    liveProfileService: () => {
      if (!ctx.store) throw new Error("test store not set");
      return fakes.fakeService(ctx.store, ctx.hashId ?? fakes.testHash);
    },
  };
});

let captured: string[] = [];

beforeEach(() => {
  captured = [];
  ctx.uid = "thabo";
  ctx.store = createFakeStore();
  ctx.hashId = null;
  const keep = (...args: unknown[]) => void captured.push(args.map(String).join(" "));
  for (const method of ["log", "info", "warn", "error"] as const) vi.spyOn(console, method).mockImplementation(keep);
  vi.spyOn(process.stdout, "write").mockImplementation((chunk: string | Uint8Array) => {
    captured.push(String(chunk));
    return true;
  });
});

afterEach(() => vi.restoreAllMocks());

const request = (body: unknown) => new Request("http://localhost/api/profile", { method: "POST", body: typeof body === "string" ? body : JSON.stringify(body) });

/** Sends a worker profile and returns the status and body; everything else lands in captured. */
async function sendWorker(body: unknown): Promise<{ status: number; text: string }> {
  const response = await postWorker(request(body));
  return { status: response.status, text: await response.text() };
}

/** The ID, its spaced form and the date of birth it encodes, in every shape that could leak. */
function leakForms(id: string): string[] {
  const dob = id.slice(0, 6);
  return [id, `${id.slice(0, 6)} ${id.slice(6, 10)} ${id.slice(10)}`, dob, `${dob.slice(0, 2)}-${dob.slice(2, 4)}-${dob.slice(4, 6)}`];
}

function expectNoLeak(id: string, response: { text: string }) {
  const everything = [...captured, response.text, ctx.store?.snapshot() ?? ""].join("\n");
  for (const form of leakForms(id)) expect(everything).not.toContain(form);
}

describe("the full ID number never leaks", () => {
  it("not when no role has been chosen yet", async () => {
    const response = await sendWorker(workerInput());
    expect(response.status).toBe(409);
    expectNoLeak(ADULT_ID, response);
  });

  it("not when the account is a business", async () => {
    ctx.uid = "sipho";
    await postRole(request({ role: "business" }));
    const response = await sendWorker(workerInput());
    expect(response.status).toBe(409);
    expectNoLeak(ADULT_ID, response);
  });

  it("not when the ID belongs to another account", async () => {
    ctx.uid = "lerato";
    await postRole(request({ role: "young_person" }));
    await sendWorker(workerInput({ firstName: "Lerato" }));
    ctx.uid = "thabo";
    await postRole(request({ role: "young_person" }));
    const response = await sendWorker(workerInput());
    expect(response.status).toBe(409);
    expect(JSON.parse(response.text).error).toBe("id_in_use");
    expectNoLeak(ADULT_ID, response);
  });

  it("not when the account already holds a different ID", async () => {
    await postRole(request({ role: "young_person" }));
    await sendWorker(workerInput({ idNumber: OTHER_ADULT_ID }));
    captured = [];
    const response = await sendWorker(workerInput());
    expect(response.status).toBe(409);
    expectNoLeak(ADULT_ID, response);
  });

  it("not when another field is wrong, typed with spaces", async () => {
    const spaced = leakForms(ADULT_ID)[1];
    const response = await sendWorker(workerInput({ idNumber: spaced, firstName: "" }));
    expect(response.status).toBe(400);
    expectNoLeak(ADULT_ID, response);
  });

  it("not when ID checks are switched off on the server", async () => {
    await postRole(request({ role: "young_person" }));
    ctx.hashId = hashIdNumber; // the real one, with no ID_HASH_SECRET in the test environment
    const response = await sendWorker(workerInput());
    expect(response.status).toBe(503);
    expectNoLeak(ADULT_ID, response);
  });

  it("not when the database fails unexpectedly", async () => {
    await postRole(request({ role: "young_person" }));
    if (!ctx.store) throw new Error("test store not set");
    ctx.store.repo.transact = async () => {
      throw new Error("deadline exceeded");
    };
    const response = await sendWorker(workerInput());
    expect(response.status).toBe(500);
    expect(captured.join("\n")).toContain("deadline exceeded");
    expectNoLeak(ADULT_ID, response);
  });

  it("not when the body isn't JSON", async () => {
    const response = await sendWorker(`{"idNumber":"${ADULT_ID}",`);
    expect(response.status).toBe(400);
    expectNoLeak(ADULT_ID, response);
  });

  it.each(Object.entries(BAD_IDS).filter(([problem]) => problem !== "format"))("not for an ID refused as %s", async (_problem, idNumber) => {
    await postRole(request({ role: "young_person" }));
    const response = await sendWorker(workerInput({ idNumber }));
    expect(response.status).toBe(422);
    expectNoLeak(idNumber, response);
  });

  it("and not on success: the response says only saved or unchanged", async () => {
    await postRole(request({ role: "young_person" }));
    const response = await sendWorker(workerInput());
    expect(JSON.parse(response.text)).toEqual({ status: "saved", complete: false });
    expectNoLeak(ADULT_ID, response);
  });
});
