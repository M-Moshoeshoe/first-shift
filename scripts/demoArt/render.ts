import { mkdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { chromium } from "playwright-core";
import { DEMO_ART } from "../../src/data/demoArt";
import { ART_DIR, PNG_DIR, artPath } from "./files";

/**
 * Draws every demo illustration (scripts/demoArt/<name>.svg) as a 384 by 384
 * PNG in scripts/demoArt/png, with Edge, the way the browser checks launch it
 * (scripts/e2e/kit.ts). The PNGs are committed, so npm run demo:reset needs
 * no browser. Run it again after changing an SVG, and look at the result.
 *
 *   npm run demo:art              every illustration
 *   npm run demo:art -- thabo     only the ones named
 */
const SIZE = 384;

async function main(): Promise<void> {
  const wanted = process.argv.slice(2);
  const names = wanted.length > 0 ? DEMO_ART.filter((name) => wanted.includes(name)) : DEMO_ART;
  mkdirSync(PNG_DIR, { recursive: true });
  const browser = await chromium.launch({ channel: "msedge" });
  try {
    const page = await browser.newPage({ viewport: { width: SIZE, height: SIZE }, deviceScaleFactor: 1 });
    for (const name of names) {
      const svg = readFileSync(join(ART_DIR, `${name}.svg`), "utf8");
      await page.setContent(`<!doctype html><style>html,body{margin:0}svg{display:block;width:${SIZE}px;height:${SIZE}px}</style>${svg}`);
      await page.screenshot({ path: artPath(name), clip: { x: 0, y: 0, width: SIZE, height: SIZE } });
      console.log(`${name}.png  ${(statSync(artPath(name)).size / 1024).toFixed(1)} KB`);
    }
  } finally {
    await browser.close();
  }
}

main().then(
  () => process.exit(0),
  (error: unknown) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  },
);
