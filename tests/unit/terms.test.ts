import { describe, expect, it } from "vitest";
import { TERMS_VERSION } from "@/config/terms";
import { decideTermsAcceptance } from "@/domain/terms";

describe("agreeing to the Terms and the Privacy notice at sign-in", () => {
  it("records a first agreement, and a new one when the version changes", () => {
    expect(decideTermsAcceptance(null, TERMS_VERSION)).toEqual({ kind: "accept" });
    expect(decideTermsAcceptance({ version: "2026-01-01" }, TERMS_VERSION)).toEqual({ kind: "accept" });
  });

  it("changes nothing when this version is already on record, so every sign-in can send it", () => {
    expect(decideTermsAcceptance({ version: TERMS_VERSION }, TERMS_VERSION)).toEqual({ kind: "unchanged" });
  });
});
