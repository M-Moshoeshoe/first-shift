import { describe, expect, it } from "vitest";
import { BLOCKED_CATEGORIES, decideWork, quotedPhrase } from "@/domain/allowedWork";

describe("decideWork", () => {
  it("allows entry-level work the AI is confident about", () => {
    expect(decideWork("stock_and_packing", 0.92)).toEqual({ decision: "allowed", category: "stock_and_packing" });
  });

  it("blocks electrical work however confident the AI is, and offers a safer option", () => {
    const result = decideWork("electrical", 0.99);
    expect(result.decision).toBe("blocked");
    if (result.decision === "blocked") expect(result.saferOption).toContain("registered electrician");
  });

  it("sends uncertain classifications to human review", () => {
    expect(decideWork("cleaning", 0.5).decision).toBe("review");
  });
});

describe("the words that show blocked work, for display", () => {
  it("keeps the model's quote only when it really is in the request, in any case", () => {
    expect(quotedPhrase("I need someone to fix the wiring in my shop", "fix the wiring")).toBe("fix the wiring");
    expect(quotedPhrase("I need someone to FIX THE WIRING in my shop", "fix the wiring")).toBe("fix the wiring");
    expect(quotedPhrase("I need someone to fix the wiring in my shop", "climb the roof")).toBeNull();
    expect(quotedPhrase("Help at the shop", null)).toBeNull();
    expect(quotedPhrase("Help at the shop", "a")).toBeNull();
  });

  it("gives every blocked kind of work a safer request to start again from", () => {
    for (const category of BLOCKED_CATEGORIES) {
      const decision = decideWork(category, 0.9, "the phrase");
      expect(decision).toMatchObject({ decision: "blocked", phrase: "the phrase" });
      if (decision.decision === "blocked") expect(decision.saferRequest.length).toBeGreaterThan(10);
    }
  });
});
