import { describe, expect, it } from "vitest";
import { shouldPromptHire } from "@/domain/hire";

describe("shouldPromptHire", () => {
  it("prompts after three tryouts with the same person, once", () => {
    expect(shouldPromptHire(2, false)).toBe(false);
    expect(shouldPromptHire(3, false)).toBe(true);
    expect(shouldPromptHire(5, true)).toBe(false);
  });
});
