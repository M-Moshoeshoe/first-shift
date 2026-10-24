import { describe, expect, it } from "vitest";
import { returnFare } from "@/domain/fares";

describe("returnFare", () => {
  it("doubles the published one-way fare in either direction", () => {
    expect(returnFare("Ivory Park", "Midrand")?.returnCents).toBe(3600);
    expect(returnFare("randburg", "ivory park")?.returnCents).toBe(5600);
  });

  it("returns null instead of inventing a fare for unknown routes", () => {
    expect(returnFare("Soweto", "Sandton")).toBeNull();
    expect(returnFare("Ivory Park", "Ivory Park")).toBeNull();
  });
});
