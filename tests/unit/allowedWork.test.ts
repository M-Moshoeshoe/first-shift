import { describe, expect, it } from "vitest";
import { decideWork } from "@/domain/allowedWork";

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
