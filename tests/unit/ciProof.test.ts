import { describe, expect, it } from "vitest";

// Throwaway: proves a failing unit test stops a Netlify deploy. Never merged; the branch is deleted after.
describe("ci proof", () => {
  it("fails on purpose", () => {
    expect(1 + 1).toBe(3);
  });
});
