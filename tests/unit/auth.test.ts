import { afterEach, describe, expect, it, vi } from "vitest";
import { requireUser } from "@/server/auth";

// Never the network: the Admin SDK's token check is replaced, and each test says what the token held.
const verifyIdToken = vi.hoisted(() => vi.fn());
vi.mock("@/server/firebaseAdmin", () => ({ adminAuth: () => ({ verifyIdToken }) }));

afterEach(() => verifyIdToken.mockReset());

const withToken = () => new Request("https://first-shift.test/api/profile", { headers: { authorization: "Bearer a-token" } });
const token = (provider: string, claims: object = {}) => ({ uid: "u1", firebase: { sign_in_provider: provider }, ...claims });

describe("requireUser", () => {
  it("accepts a Google sign-in as a real person, and a demo account's server-minted token as demo", async () => {
    verifyIdToken.mockResolvedValueOnce(token("google.com"));
    await expect(requireUser(withToken())).resolves.toEqual({ uid: "u1", demo: false });
    verifyIdToken.mockResolvedValueOnce(token("custom", { demo: true, email: "thabo@firstshift.demo" }));
    await expect(requireUser(withToken())).resolves.toEqual({ uid: "u1", demo: true });
  });

  it("refuses a password sign-in on any account, demo or not, even with a valid token", async () => {
    verifyIdToken.mockResolvedValueOnce(token("password"));
    await expect(requireUser(withToken())).rejects.toMatchObject({ status: 403, code: "sign_in_not_allowed" });
    verifyIdToken.mockResolvedValueOnce(token("password", { demo: true, email: "thabo@firstshift.demo" }));
    await expect(requireUser(withToken())).rejects.toMatchObject({ status: 403, code: "sign_in_not_allowed" });
    verifyIdToken.mockResolvedValueOnce(token("anonymous", { demo: true }));
    await expect(requireUser(withToken())).rejects.toMatchObject({ status: 403 });
  });

  it("refuses a demo account whose email was moved off the demo domain from the browser", async () => {
    verifyIdToken.mockResolvedValueOnce(token("custom", { demo: true, email: "taken-over@gmail.com" }));
    await expect(requireUser(withToken())).rejects.toMatchObject({ status: 403, code: "sign_in_not_allowed" });
  });

  it("refuses a missing or invalid token before any of that", async () => {
    await expect(requireUser(new Request("https://first-shift.test/"))).rejects.toMatchObject({ status: 401, code: "not_signed_in" });
    verifyIdToken.mockRejectedValueOnce(new Error("expired"));
    await expect(requireUser(withToken())).rejects.toMatchObject({ status: 401, code: "session_expired" });
  });
});
