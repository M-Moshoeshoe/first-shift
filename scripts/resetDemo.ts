import { seededReferenceText } from "../src/server/demoReference";
import { resetDemoWorld } from "../src/server/repositories/firestoreDemoWorld";
import { announceTarget } from "./adminTarget";

/**
 * Puts the demo world back to its known state, the same reset as "Reset the
 * demo" in the app (src/server/repositories/firestoreDemoWorld.ts). It
 * touches only demo records.
 *
 *   npm run demo:reset          (after npm run demo:accounts)
 */
async function main(): Promise<void> {
  announceTarget();
  const summary = await resetDemoWorld(new Date(), await seededReferenceText());
  console.log(`Removed ${summary.removed} demo documents.`);
  console.log(`Restored: 2 demo accounts, 3 businesses, ${summary.history} finished tryouts between Sipho and Thabo, ${summary.tryouts} live tryouts, and Thabo's application to Sipho's first one, beside six example applicants.`);
}

main().then(
  () => process.exit(0),
  (error: unknown) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  },
);
