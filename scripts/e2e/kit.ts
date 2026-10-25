import { mkdirSync } from "node:fs";
import { createRequire } from "node:module";
import { join } from "node:path";
import { chromium, type Browser, type Page } from "playwright-core";

/**
 * Shared tools for the browser checks: Edge at a given width, a check that
 * screenshots the screen and runs axe-core on it, Slow 4G throttling, and a
 * skeleton measurement. Tools only; app code never imports scripts/.
 */
export const BASE = process.env.E2E_BASE_URL ?? "http://localhost:3000";
const AXE_PATH = createRequire(import.meta.url).resolve("axe-core/axe.min.js");

// Chrome DevTools' "Slow 4G" preset (formerly "Fast 3G"): 1.6 Mbps down and 750 kbps up at 90%, 150 ms RTT x 3.75.
export const SLOW_4G = { offline: false, latency: 562.5, downloadThroughput: 180_000, uploadThroughput: 84_375 };

export interface CheckRow {
  width: number;
  step: string;
  path: string;
  axe: string;
}

export interface Recorder {
  width: number;
  rows: CheckRow[];
  failures: string[];
  /** heading: false for loading screens, which have no h1 yet. */
  check(page: Page, name: string, options?: { heading?: boolean }): Promise<void>;
}

export function launchEdge(): Promise<Browser> {
  return chromium.launch({ channel: "msedge" });
}

export async function newPage(browser: Browser, width: number, extra: { geolocation?: boolean } = {}): Promise<Page> {
  const phone = width < 1024;
  const context = await browser.newContext({
    viewport: { width, height: phone ? 740 : 800 },
    deviceScaleFactor: phone ? 2 : 1,
    isMobile: phone,
    hasTouch: phone,
    permissions: extra.geolocation ? ["geolocation"] : [],
    geolocation: { latitude: -25.99634, longitude: 28.22711, accuracy: 20 }, // Tembisa
  });
  // Next's dev-tools badge exists only under next dev and sits over the bottom of the screen.
  await context.addInitScript(() => {
    document.addEventListener("DOMContentLoaded", () => {
      const style = document.createElement("style");
      style.textContent = "nextjs-portal { display: none !important; }";
      document.head.append(style);
    });
  });
  const page = await context.newPage();
  page.setDefaultTimeout(60_000); // the dev server compiles each route on first visit
  return page;
}

type AxeViolation = { id: string; impact: string | null; nodes: unknown[] };

/**
 * Serious and critical axe-core findings on the current screen. The caller
 * sets reduced motion first, so scroll reveals mid-fade are judged at their
 * final opacity, as the person sees them. The emulator's dev-only banner is left out.
 */
async function axeProblems(page: Page): Promise<AxeViolation[]> {
  const loaded = await page.evaluate(() => "axe" in window);
  if (!loaded) await page.addScriptTag({ path: AXE_PATH });
  const violations = await page.evaluate(async () => {
    const axe = (window as unknown as { axe: { run: (context: unknown, options: unknown) => Promise<{ violations: AxeViolation[] }> } }).axe;
    const result = await axe.run({ exclude: [["#firebase-emulator-warning"], ["nextjs-portal"]] }, { resultTypes: ["violations"] });
    return result.violations.map((v) => ({ id: v.id, impact: v.impact, nodes: v.nodes.map(() => null) }));
  });
  return violations.filter((v) => v.impact === "serious" || v.impact === "critical");
}

export function recorder(width: number, shots: string): Recorder {
  const dir = join(shots, String(width));
  mkdirSync(dir, { recursive: true });
  let step = 0;
  const rec: Recorder = {
    width,
    rows: [],
    failures: [],
    async check(page, name, { heading = true } = {}) {
      step += 1;
      const label = `${String(step).padStart(2, "0")} ${name}`;
      if (heading) await page.locator("h1").first().waitFor();
      const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
      if (scrollWidth > width) rec.failures.push(`${width} px, ${label}: scrolls sideways (${scrollWidth} px)`);
      // Reduced motion for the screenshot and axe alike: a full-page capture doesn't scroll, so scroll
      // reveals would otherwise show mid-fade, and axe would judge their contrast at partial opacity.
      await page.emulateMedia({ reducedMotion: "reduce" });
      await page.screenshot({ path: join(dir, `${label.replace(/[^a-z0-9]+/gi, "-")}.png`), fullPage: true });
      const problems = await axeProblems(page);
      await page.emulateMedia({ reducedMotion: null });
      for (const p of problems) rec.failures.push(`${width} px, ${label}: axe ${p.impact} ${p.id} (${p.nodes.length})`);
      rec.rows.push({ width, step: label, path: new URL(page.url()).pathname + new URL(page.url()).search, axe: problems.length === 0 ? "clean" : problems.map((p) => p.id).join(", ") });
    },
  };
  return rec;
}

/** Holds GET /api/profile until release(), so the loading state stays on screen long enough to measure. */
export async function holdProfile(page: Page): Promise<() => Promise<void>> {
  let release: () => void = () => undefined;
  const gate = new Promise<void>((resolve) => (release = resolve));
  const handler = async (route: { request: () => { method: () => string }; continue: () => Promise<void> }) => {
    if (route.request().method() === "GET") await gate;
    await route.continue().catch(() => undefined);
  };
  await page.route("**/api/profile", handler);
  return async () => {
    release();
    await page.unroute("**/api/profile", handler);
  };
}

/** The title block's height and where the content under it starts, for the skeleton and for the real screen. */
export function measureLayout(page: Page, which: "skeleton" | "real"): Promise<{ title: number; body: number | null }> {
  // No named helpers inside: tsx wraps them in __name(), which doesn't exist in the page.
  return page.evaluate((kind) => {
    const root = document.querySelector('[role="status"][aria-label="Loading your page"]');
    const block = document.querySelector("main h1")?.parentElement;
    const title = kind === "skeleton" ? root?.children[0] : block;
    const body = kind === "skeleton" ? root?.children[1] : block?.nextElementSibling;
    return { title: title ? title.getBoundingClientRect().height : -1, body: body ? body.getBoundingClientRect().top : null };
  }, which);
}

/** Applies Slow 4G to one page through the DevTools protocol. */
export async function throttle(page: Page): Promise<void> {
  const cdp = await page.context().newCDPSession(page);
  await cdp.send("Network.enable");
  await cdp.send("Network.emulateNetworkConditions", SLOW_4G);
}

/** Back to the full-speed network after a throttled timing. */
export async function unthrottle(page: Page): Promise<void> {
  const cdp = await page.context().newCDPSession(page);
  await cdp.send("Network.enable");
  await cdp.send("Network.emulateNetworkConditions", { offline: false, latency: 0, downloadThroughput: -1, uploadThroughput: -1 });
}

export async function signIn(page: Page, account: string): Promise<void> {
  await page.getByLabel("Test account (emulators only)").fill(account);
  await page.getByRole("button", { name: "Sign in as test account" }).click();
}

export const pathIs = (page: Page, path: string) => page.waitForURL((url) => url.pathname === path);
