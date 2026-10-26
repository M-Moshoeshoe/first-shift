import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/*
 * The house rule (GOV.UK style): positive contractions are fine (you'll,
 * it's); negative and conditional ones are not (cannot, do not, we would).
 * Every word a person can read lives in src/, as a string or JSX text, so
 * this reads every source file with its comments taken out. The one file
 * left out is the AI prompts: instructions to the model, never shown to anyone.
 */
const NOT_SHOWN = new Set([join("src", "server", "prompts.ts")]);
const CONTRACTION = /\b(?:can|don|doesn|didn|isn|aren|wasn|weren|haven|hasn|won|couldn|shouldn|wouldn|mustn)(?:'|’|&apos;)t\b|\b(?:we|you|they|it)(?:'|’|&apos;)d\b/i;

function sourceFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return sourceFiles(path);
    return /\.tsx?$/.test(entry.name) && !NOT_SHOWN.has(path) ? [path] : [];
  });
}

/** Comments out: block comments, and line comments that start a line or follow a space (so "https://" stays). */
const withoutComments = (source: string): string => source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|\s)\/\/.*$/gm, "$1");

describe("user-facing copy", () => {
  it("has no negative or conditional contractions anywhere in src", () => {
    const found = sourceFiles("src").flatMap((path) =>
      withoutComments(readFileSync(path, "utf8"))
        .split("\n")
        .filter((line) => CONTRACTION.test(line))
        .map((line) => `${path}: ${line.trim()}`),
    );
    expect(found).toEqual([]);
  });
});
