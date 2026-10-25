import { describe, expect, it } from "vitest";
import { isAllowedSignIn } from "@/domain/signIn";

describe("isAllowedSignIn", () => {
  it("lets everyone in with Google", () => {
    expect(isAllowedSignIn("google.com", false)).toBe(true);
  });

  it("lets a password in only on a demo account", () => {
    expect(isAllowedSignIn("password", true)).toBe(true);
    expect(isAllowedSignIn("password", false)).toBe(false);
  });

  it("allows tokens minted with the server's own credentials", () => {
    expect(isAllowedSignIn("custom", false)).toBe(true);
  });

  it.each(["anonymous", "phone", "github.com", undefined])("refuses any other way in: %s", (provider) => {
    expect(isAllowedSignIn(provider, true)).toBe(false);
  });
});
