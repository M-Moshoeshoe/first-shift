import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

// Security rules tests. Run through `npm run rules`, which starts the emulators first.
export default defineConfig({
  resolve: { alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) } },
  test: { environment: "node", include: ["tests/rules/**/*.test.ts"], testTimeout: 20000, fileParallelism: false },
});
