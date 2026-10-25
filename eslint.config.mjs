import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

// Scripts (budget, AI eval, end-to-end checks) are tools, never part of the app.
const noScripts = { group: ["**/scripts/*", "**/scripts/**"], message: "App code must never import from scripts/." };

export default defineConfig([
  ...nextVitals,
  ...nextTs,
  globalIgnores([".next/**", ".netlify/**", "out/**", "build/**", "coverage/**", "next-env.d.ts"]),
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
    files: ["src/**/*.{ts,tsx}"],
    ignores: ["src/domain/**/*.ts", "src/config/**/*.ts", "src/server/**/*.ts"],
    rules: { "no-restricted-imports": ["error", { patterns: [noScripts] }] },
  },
  {
    // Shared components serve the app; they never reach back into a route's code.
    // A later no-restricted-imports entry replaces earlier ones for the same files, so each repeats noScripts.
    files: ["src/components/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": ["error", { patterns: [noScripts, { group: ["@/app/*", "@/app/**", "**/app/*"], message: "Components must not import from app/." }] }],
    },
  },
  {
    // Pages, layouts and their components never reach server code: only route handlers (route.ts) do (AGENTS.md).
    files: ["src/app/**/*.tsx"],
    rules: {
      "no-restricted-imports": ["error", { patterns: [noScripts, { group: ["@/server/*", "@/server/**", "server-only"], message: "Pages and components must not import server code; call a route handler instead." }] }],
    },
  },
  {
    // Client helpers run in the browser; server code (secrets, Admin SDK) must never reach them.
    files: ["src/lib/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": ["error", { patterns: [noScripts, { group: ["@/server/*", "@/server/**", "**/server/*", "server-only"], message: "Client helpers must not import server code." }] }],
    },
  },
  {
    files: ["scripts/**/*.ts", "tests/**/*.ts"],
    rules: { "no-console": "off" },
  },
]);
