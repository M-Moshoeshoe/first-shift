import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

export default defineConfig([
  ...nextVitals,
  ...nextTs,
  globalIgnores([".next/**", "out/**", "build/**", "coverage/**", "next-env.d.ts"]),
  {
    rules: {
      // No God files: split anything that grows past this.
      "max-lines": ["error", { max: 250, skipBlankLines: true, skipComments: true }],
      "max-lines-per-function": ["warn", { max: 80, skipBlankLines: true, skipComments: true }],
      "@typescript-eslint/no-explicit-any": "error",
      "no-console": ["error", { allow: ["warn", "error"] }],
    },
  },
  {
    // The domain layer is pure: no framework, no Firebase, no network.
    files: ["src/domain/**/*.ts", "src/config/**/*.ts"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            { group: ["@/app/*", "@/server/*", "@/lib/*", "@/components/*"], message: "Domain code must not depend on outer layers." },
            { group: ["firebase", "firebase/*", "firebase-admin", "firebase-admin/*", "next", "next/*", "react", "react-dom", "@anthropic-ai/*"], message: "Domain code must stay pure." },
          ],
        },
      ],
    },
  },
  {
    // Server code never reaches into UI code.
    files: ["src/server/**/*.ts"],
    rules: {
      "no-restricted-imports": ["error", { patterns: [{ group: ["@/app/*", "@/components/*", "@/lib/*"], message: "Server code must not import UI or client code." }] }],
    },
  },
  {
    // Scripts (seed, budget, end-to-end checks) are tools, never part of the app.
    files: ["src/**/*.{ts,tsx}"],
    ignores: ["src/domain/**/*.ts", "src/config/**/*.ts", "src/server/**/*.ts"],
    rules: {
      "no-restricted-imports": ["error", { patterns: [{ group: ["**/scripts/*", "**/scripts/**"], message: "App code must never import from scripts/." }] }],
    },
  },
  {
    files: ["scripts/**/*.ts", "tests/**/*.ts"],
    rules: { "no-console": "off" },
  },
]);
