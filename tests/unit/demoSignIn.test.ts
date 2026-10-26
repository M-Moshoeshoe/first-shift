import { afterEach, describe, expect, it, vi } from "vitest";
import { DEMO_MESSAGES } from "@/domain/messages";
import { demoPasswordMatches, hashDemoPassword } from "@/server/demoPassword";
import { createDemoSignInService, type DemoAccount } from "@/server/services/demoSignInService";

const thabo: DemoAccount = { uid: "demo-thabo", email: "thabo@firstshift.demo", role: "young_person", ...hashDemoPassword("correct-horse-7") };

function fakes() {
  const restore = vi.fn(async () => undefined);
  const mintToken = vi.fn(async (uid: string) => `token-for-${uid}`);
  const findByEmail = vi.fn(async (email: string) => (email === thabo.email ? thabo : null));
  const findByRole = vi.fn(async (role: string) => (role === thabo.role ? thabo : null));
  return { restore, mintToken, findByEmail, findByRole, service: createDemoSignInService({ findByEmail, findByRole, restore, mintToken }) };
}

afterEach(() => vi.restoreAllMocks());

describe("demo passwords", () => {
  it("are stored only as a salted hash that matches the right password and nothing else", () => {
    const stored = hashDemoPassword("battery-staple-9");
    expect(JSON.stringify(stored)).not.toContain("battery-staple-9");
    expect(hashDemoPassword("battery-staple-9").salt).not.toBe(stored.salt);
    expect(demoPasswordMatches("battery-staple-9", stored)).toBe(true);
    expect(demoPasswordMatches("Battery-staple-9", stored)).toBe(false);
    expect(demoPasswordMatches("", stored)).toBe(false);
  });
});

describe("demo sign-in", () => {
  it("puts the account back as the script made it, then mints a token, for the right email in any case", async () => {
    const { service, restore, mintToken } = fakes();
    await expect(service.signIn("  Thabo@FirstShift.demo ", "correct-horse-7")).resolves.toEqual({ token: "token-for-demo-thabo" });
    expect(restore).toHaveBeenCalledWith(thabo);
    expect(restore.mock.invocationCallOrder[0]).toBeLessThan(mintToken.mock.invocationCallOrder[0] ?? 0);
  });

  it("refuses a wrong password, an unknown email and any email off the demo domain alike, and mints nothing", async () => {
    const { service, restore, mintToken, findByEmail } = fakes();
    vi.spyOn(console, "warn").mockImplementation(() => undefined);
    for (const [email, password] of [["thabo@firstshift.demo", "Correct-horse-7"], ["lerato@firstshift.demo", "correct-horse-7"], ["thabo@gmail.com", "correct-horse-7"]] as const) {
      await expect(service.signIn(email, password)).rejects.toMatchObject({ status: 401, code: "demo_credentials", publicMessage: DEMO_MESSAGES.wrongCredentials });
    }
    // A real person's email never reaches the lookup.
    expect(findByEmail).not.toHaveBeenCalledWith("thabo@gmail.com");
    expect(restore).not.toHaveBeenCalled();
    expect(mintToken).not.toHaveBeenCalled();
  });

  it("logs a refusal without the email or the password", async () => {
    const { service } = fakes();
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    await service.signIn("thabo@firstshift.demo", "wrong-password").catch(() => undefined);
    const logged = warn.mock.calls.flat().join(" ");
    expect(logged).toContain("demo_sign_in_refused");
    expect(logged).not.toMatch(/thabo|wrong-password/i);
  });
});

describe("one-tap demo sign-in", () => {
  it("finds the account by its role, puts it back as the script made it, then mints a token, with no password", async () => {
    const { service, restore, mintToken } = fakes();
    await expect(service.tryAs("young_person")).resolves.toEqual({ token: "token-for-demo-thabo" });
    expect(restore).toHaveBeenCalledWith(thabo);
    expect(restore.mock.invocationCallOrder[0]).toBeLessThan(mintToken.mock.invocationCallOrder[0] ?? 0);
  });

  it("says the demo isn't set up, and mints nothing, when the role has no account on record", async () => {
    const { service, mintToken } = fakes();
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    await expect(service.tryAs("business")).rejects.toMatchObject({ status: 503, code: "demo_missing", publicMessage: DEMO_MESSAGES.notSetUp });
    expect(mintToken).not.toHaveBeenCalled();
  });
});
