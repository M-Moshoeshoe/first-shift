import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { gzipSync } from "node:zlib";
import { JS_BUDGETS_KB } from "../src/config/performance";

/**
 * Measures each page's JavaScript in the production build, gzipped at the
 * default level, against src/config/performance.ts. Fails closed: a page over
 * budget, or missing build output, exits with an error like a broken test.
 */
const APP_DIR = join(".next", "server", "app");

const htmlFile = (route: string): string => join(APP_DIR, `${route === "/" ? "index" : route.slice(1)}.html`);

function scriptsOf(html: string): string[] {
  const sources = [...html.matchAll(/<script[^>]+src="\/_next\/(static\/[^"]+\.js)"/g)].map((match) => match[1] ?? "");
  return [...new Set(sources)].filter(Boolean);
}

function gzipKb(route: string): { kb: number; scripts: number } {
  const scripts = scriptsOf(readFileSync(htmlFile(route), "utf8"));
  const bytes = scripts.reduce((sum, src) => sum + gzipSync(readFileSync(join(".next", src))).length, 0);
  return { kb: bytes / 1024, scripts: scripts.length };
}

let failed = false;
for (const [route, limit] of Object.entries(JS_BUDGETS_KB)) {
  if (!existsSync(htmlFile(route))) {
    console.error(`${route}: no build output at ${htmlFile(route)}. Run npm run build first.`);
    failed = true;
    continue;
  }
  const { kb, scripts } = gzipKb(route);
  const over = kb > limit;
  failed ||= over;
  console.log(`${over ? "OVER" : "ok  "}  ${route.padEnd(12)} ${kb.toFixed(1).padStart(6)} KB of ${limit} KB gzip, ${scripts} scripts`);
}

// Pages without a budget yet: a reminder, not a failure.
const budgeted = new Set(Object.keys(JS_BUDGETS_KB));
const unbudgeted = readdirSync(APP_DIR, { recursive: true, encoding: "utf8" })
  .filter((file) => file.endsWith(".html") && !file.startsWith("_"))
  .map((file) => (file === "index.html" ? "/" : `/${file.replace(/\\/g, "/").replace(/\.html$/, "")}`))
  .filter((route) => !budgeted.has(route));
if (unbudgeted.length > 0) console.log(`no budget yet: ${unbudgeted.join(", ")}`);

if (failed) {
  console.error("JavaScript budget failed. Shrink the page, or raise its budget in src/config/performance.ts with a reason.");
  process.exit(1);
}
