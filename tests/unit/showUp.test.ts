import { describe, expect, it } from "vitest";
import { predictShowUp } from "@/domain/showUp";

describe("predictShowUp", () => {
  it("rates someone on time for every tryout as high, with the reason", () => {
    const prediction = predictShowUp({ completed: 4, onTime: 4, lateCancellations: 0, noShows: 0 }, 3600, 24184);
    expect(prediction.band).toBe("high");
    expect(prediction.reasons).toContain("On time for 4 of 4 tryouts");
  });

  it("labels first-timers as new instead of guessing", () => {
    const prediction = predictShowUp({ completed: 0, onTime: 0, lateCancellations: 0, noShows: 0 }, 3600, 24184);
    expect(prediction.band).toBe("new");
    expect(prediction.reasons[0]).toBe("First tryout, no record yet");
  });

  it("lowers the score for no-shows and says so", () => {
    const prediction = predictShowUp({ completed: 2, onTime: 2, lateCancellations: 0, noShows: 2 }, null, 24184);
    expect(prediction.score).toBe(50);
    expect(prediction.band).toBe("low");
    expect(prediction.reasons).toContain("2 no-shows");
  });

  it("explains when the fare eats a big share of the pay", () => {
    const prediction = predictShowUp({ completed: 3, onTime: 3, lateCancellations: 0, noShows: 0 }, 5600, 12092);
    expect(prediction.reasons).toContain("The return fare is 46% of the pay");
    expect(prediction.score).toBe(80);
  });
});
