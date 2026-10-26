import { describe, expect, it } from "vitest";
import { errorFromResponse } from "@/lib/api";
import { signInErrorMessage } from "@/domain/messages";

describe("sign-in messages", () => {
  it("says what happened and what to do when the popup is blocked or closed", () => {
    expect(signInErrorMessage("auth/popup-blocked")).toMatch(/blocked.*Allow pop-ups/);
    expect(signInErrorMessage("auth/popup-closed-by-user")).toMatch(/closed.*try again/);
  });

  it("falls back to a plain sentence for codes it doesn't know", () => {
    expect(signInErrorMessage("auth/something-new")).toMatch(/did not finish.*try again/);
  });

  it("never apologises or uses an em dash", () => {
    for (const code of ["auth/popup-blocked", "auth/popup-closed-by-user", "auth/network-request-failed", "auth/x"]) {
      expect(signInErrorMessage(code)).not.toMatch(/sorry|—/i);
    }
  });
});

describe("API error messages", () => {
  it("shows the server's own public message when it sent one", () => {
    const error = errorFromResponse(409, { error: "id_in_use", message: "This ID number is already linked to another account." });
    expect(error.code).toBe("id_in_use");
    expect(error.message).toBe("This ID number is already linked to another account.");
  });

  it("gives a plain sentence for a reply without a message", () => {
    expect(errorFromResponse(401, null).message).toMatch(/Sign in again/);
    expect(errorFromResponse(500, "<html>").message).toMatch(/Try again in a minute/);
  });
});
