import { describe, expect, it } from "vitest";
import { isDemoEmail, sameWorld } from "@/domain/demo";
import { isAllowedSignIn } from "@/domain/signIn";

const real = { demo: false };
const demo = { demo: true, email: "sipho@firstshift.demo" };

describe("isAllowedSignIn", () => {
  it("lets everyone in with Google", () => {
    expect(isAllowedSignIn("google.com", real)).toBe(true);
  });

  it("refuses a password sign-in straight to Firebase, even on a demo account", () => {
    expect(isAllowedSignIn("password", demo)).toBe(false);
    expect(isAllowedSignIn("password", real)).toBe(false);
  });

  it("lets a demo account in only through the server's own token, on its demo email", () => {
    expect(isAllowedSignIn("custom", demo)).toBe(true);
    expect(isAllowedSignIn("google.com", demo)).toBe(false);
    expect(isAllowedSignIn("custom", { demo: true, email: "someone@gmail.com" })).toBe(false);
    expect(isAllowedSignIn("custom", { demo: true })).toBe(false);
  });

  it("allows tokens minted with the server's own credentials", () => {
    expect(isAllowedSignIn("custom", real)).toBe(true);
  });

  it.each(["anonymous", "phone", "github.com", "emailLink", undefined])("refuses any other way in: %s", (provider) => {
    expect(isAllowedSignIn(provider, real)).toBe(false);
    expect(isAllowedSignIn(provider, demo)).toBe(false);
  });
});

describe("demo isolation", () => {
  it("keeps demo and real apart, and counts a record with no mark as real", () => {
    expect(sameWorld({ demo: true }, { demo: true })).toBe(true);
    expect(sameWorld({ demo: false }, { demo: false })).toBe(true);
    expect(sameWorld({ demo: false }, {})).toBe(true);
    expect(sameWorld({ demo: true }, {})).toBe(false);
    expect(sameWorld({ demo: true }, { demo: false })).toBe(false);
    expect(sameWorld({ demo: false }, { demo: true })).toBe(false);
  });

  it("recognises only the demo domain, in any case", () => {
    expect(isDemoEmail("Thabo@FirstShift.demo")).toBe(true);
    expect(isDemoEmail("thabo@firstshift.demo.evil.com")).toBe(false);
    expect(isDemoEmail("firstshift.demo@gmail.com")).toBe(false);
    expect(isDemoEmail(undefined)).toBe(false);
  });
});
