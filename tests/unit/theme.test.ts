import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { THEME_COLOR } from "@/config/theme";

const read = (path: string) => readFileSync(new URL(`../../${path}`, import.meta.url), "utf8");

// Hex colours are compared without regard to case: #0a6b47 and #0A6B47 are the same colour.
const sameColour = (a: string, b: string) => a.toLowerCase() === b.toLowerCase();

describe("theme colour has one source", () => {
  it("matches --color-primary in globals.css", () => {
    const match = read("src/app/globals.css").match(/--color-primary:\s*(#[0-9a-fA-F]{6})\s*;/);
    expect(match, "--color-primary is missing from globals.css").not.toBeNull();
    expect(sameColour(match?.[1] ?? "", THEME_COLOR), `--color-primary is ${match?.[1]}, THEME_COLOR is ${THEME_COLOR}`).toBe(true);
  });

  it("matches theme_color in the web app manifest", () => {
    const manifest: unknown = JSON.parse(read("public/manifest.webmanifest"));
    const themeColor = typeof manifest === "object" && manifest !== null && "theme_color" in manifest ? String(manifest.theme_color) : "";
    expect(sameColour(themeColor, THEME_COLOR), `manifest theme_color is ${themeColor}, THEME_COLOR is ${THEME_COLOR}`).toBe(true);
  });
});
