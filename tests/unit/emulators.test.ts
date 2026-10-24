import { describe, expect, it } from "vitest";
import { shouldUseEmulators } from "@/lib/emulators";

describe("emulator guard", () => {
  it("connects only when the switch is on and the page is local", () => {
    expect(shouldUseEmulators("true", "localhost")).toBe(true);
    expect(shouldUseEmulators("true", "127.0.0.1")).toBe(true);
  });

  it("does nothing on a live address, even with the switch left on", () => {
    expect(shouldUseEmulators("true", "first-shift.netlify.app")).toBe(false);
    expect(shouldUseEmulators("true", "192.168.24.1")).toBe(false);
    expect(shouldUseEmulators("true", "localhost.evil.example")).toBe(false);
  });

  it("stays off unless the switch is exactly true", () => {
    for (const flag of [undefined, "", "false", "TRUE", "1", "yes"]) {
      expect(shouldUseEmulators(flag, "localhost")).toBe(false);
    }
  });
});
