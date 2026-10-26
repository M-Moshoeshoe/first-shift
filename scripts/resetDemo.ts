import { DEMO_ART } from "../src/data/demoArt";
import { seededReferenceText } from "../src/server/demoReference";
import { resetDemoWorld } from "../src/server/repositories/firestoreDemoWorld";
import { announceTarget } from "./adminTarget";
import { readArt } from "./demoArt/files";

/**
 * Puts the demo world back to its known state, the same reset as "Reset the
 * demo" in the app (src/server/repositories/firestoreDemoWorld.ts). It
 * touches only demo records. It also uploads the demo faces and shopfronts
 * from scripts/demoArt/png, always replacing what was there: the app's reset
 * cannot read them, so it only fills a gap with a drawn placeholder.
 *
 *   npm run demo:reset          (after npm run demo:accounts)
 */
async function main(): Promise<void> {
  announceTarget();
  const summary = await resetDemoWorld(new Date(), await seededReferenceText(), readArt);
  console.log(`Removed ${summary.removed} demo documents.`);
  console.log(`Restored: 2 demo accounts, 3 businesses, ${summary.history} finished tryouts between Sipho and Thabo, ${summary.tryouts} live tryouts, and Thabo's application to Sipho's first one, beside six example applicants.`);
  console.log(`Uploaded ${summary.illustrations} of ${DEMO_ART.length} illustrated faces and shopfronts.`);
  if (summary.illustrations < DEMO_ART.length) console.warn("Some illustrations are missing from scripts/demoArt/png, so placeholders stand in. Run npm run demo:art, then npm run demo:reset again.");
}

main().then(
  () => process.exit(0),
  (error: unknown) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  },
);
