import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { DemoArt } from "../../src/data/demoArt";

/**
 * Where the demo's illustrations live: the hand-written SVG sources here, and
 * the PNGs npm run demo:art draws from them, which are committed. Read by
 * npm run demo:reset, which uploads them, and by npm run e2e:demo, which
 * checks the app serves them. Tools only; app code never imports scripts/.
 */
export const ART_DIR = dirname(fileURLToPath(import.meta.url));
export const PNG_DIR = join(ART_DIR, "png");

export const artPath = (name: DemoArt): string => join(PNG_DIR, `${name}.png`);

/** The rendered PNG for one illustration, or null if it has not been drawn: the reset then falls back to a placeholder. */
export const readArt = (name: DemoArt): Buffer | null => (existsSync(artPath(name)) ? readFileSync(artPath(name)) : null);
