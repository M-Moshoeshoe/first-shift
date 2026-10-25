import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
      // server-only throws outside a React Server Component build; tests run server code directly.
      "server-only": fileURLToPath(new URL("./node_modules/server-only/empty.js", import.meta.url)),
    },
  },
  // hermeticEnv clears real settings first, so tests behave the same on a laptop and in Netlify's build.
  test: { environment: "node", include: ["tests/unit/**/*.test.ts", "tests/unit/**/*.test.tsx"], setupFiles: ["tests/unit/support/hermeticEnv.ts"] },
});
