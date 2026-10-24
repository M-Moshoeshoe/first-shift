import { describe, expect, it } from "vitest";
import { feesDueCents } from "@/domain/fees";
import { shouldPromptHire } from "@/domain/hire";
import { formatRand } from "@/domain/money";

describe("shouldPromptHire", () => {
  it("prompts after three tryouts with the same person, once", () => {
    expect(shouldPromptHire(2, false)).toBe(false);
    expect(shouldPromptHire(3, false)).toBe(true);
    expect(shouldPromptHire(5, true)).toBe(false);
  });
});

describe("feesDueCents", () => {
  it("charges R25 per completed tryout", () => {
    expect(formatRand(feesDueCents(3))).toBe("R75.00");
    expect(formatRand(feesDueCents(1000))).toBe("R25,000.00");
  });
});
