import { afterEach, describe, expect, it, vi } from "vitest";
import { requireUser } from "@/server/auth";

// Never the network: the Admin SDK's token check is replaced, and each test says what the token held.
const verifyIdToken = vi.hoisted(() => vi.fn());
vi.mock("@/server/firebaseAdmin", () => ({ adminAuth: () => ({ verifyIdToken }) }));

afterEach(() => verifyIdToken.mockReset());

const withToken = () => new Request("https://first-shift.test/api/profile", { headers: { authorization: "Bearer a-token" } });
const token = (provider: string, claims: object = {}) => ({ uid: "u1", firebase: { sign_in_provider: provider }, ...claims });

describe("requireUser", () => {
  it("accepts a Google sign-in, and a password sign-in on a demo account", async () => {
    verifyIdToken.mockResolvedValueOnce(token("google.com"));
    await expect(requireUser(withToken())).resolves.toEqual({ uid: "u1" });
    verifyIdToken.mockResolvedValueOnce(token("password", { demo: true }));
    await expect(requireUser(withToken())).resolves.toEqual({ uid: "u1" });
  });

  it("refuses a password sign-in on any other account, even with a valid token", async () => {
    verifyIdToken.mockResolvedValueOnce(token("password"));
    await expect(requireUser(withToken())).rejects.toMatchObject({ status: 403, code: "sign_in_not_allowed" });
    verifyIdToken.mockResolvedValueOnce(token("anonymous", { demo: true }));
    await expect(requireUser(withToken())).rejects.toMatchObject({ status: 403 });
  });

  it("refuses a missing or invalid token before any of that", async () => {
    await expect(requireUser(new Request("https://first-shift.test/"))).rejects.toMatchObject({ status: 401, code: "not_signed_in" });
    verifyIdToken.mockRejectedValueOnce(new Error("expired"));
    await expect(requireUser(withToken())).rejects.toMatchObject({ status: 401, code: "session_expired" });
  });
});
