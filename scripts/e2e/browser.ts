import { tmpdir } from "node:os";
import { join } from "node:path";
import type { Browser } from "playwright-core";
import { business, youngPerson } from "./flows";
import { bookingWalk } from "./bookingFlow";
import { creditsWalk } from "./creditsFlow";
import { dayWalk } from "./dayFlow";
import { postingAndDashboard } from "./postingFlow";
import { BASE, launchEdge, newPage, pathIs, recorder, signIn, throttle, type Recorder } from "./kit";
import { clearEmulators, requireEmulators, run } from "./session";

type Timing = { timing: string; seconds: string };

/**
 * Every route, walked like a real person in Microsoft Edge, as the quality
 * gate for the UI:
 *  1. at 360 px and at 1280 px: both onboarding journeys, every routing
 *     path, skeletons measured against the real screens, axe-core on every
 *     screen (zero serious or critical issues) and a screenshot of each;
 *     then posting a tryout (with the real model) and the dashboard, every state;
 *  2. Slow 4G timings for the home page, both onboarding journeys and both business pages.
 * Signs in with the test-only emulator sign-in, which exists only in development.
 *
 *   npm run emulators   then   npm run dev   then   npm run e2e:browser
 *   E2E_PROD_BASE_URL=http://localhost:3100 times the home page on a production build (npm run build, npx next start -p 3100).
 */
requireEmulators(["FIRESTORE_EMULATOR_HOST", "FIREBASE_AUTH_EMULATOR_HOST", "FIREBASE_STORAGE_EMULATOR_HOST"]);

const SHOTS = process.env.E2E_SHOTS ?? join(tmpdir(), "first-shift-e2e");
const PROD = process.env.E2E_PROD_BASE_URL;

async function walk(browser: Browser, width: number): Promise<{ rec: Recorder; timings: Timing[] }> {
  await clearEmulators();
  const rec = recorder(width, SHOTS);
  const page = await newPage(browser, width, { geolocation: true });
  try {
    await youngPerson(rec, page);
    await business(rec, page);
    const timings = await postingAndDashboard(rec, page);
    const bookingPath = await bookingWalk(rec, page);
    await dayWalk(rec, page, bookingPath);
    await creditsWalk(rec, page, bookingPath);
    return { rec, timings };
  } catch (error) {
    // The screen as it was when a step failed, next to the others.
    await page.screenshot({ path: join(SHOTS, `${width}-failure.png`), fullPage: true }).catch(() => undefined);
    console.error(`Failed at ${page.url()} after: ${rec.rows.at(-1)?.step ?? "the start"}. Screenshot: ${join(SHOTS, `${width}-failure.png`)}`);
    throw error;
  } finally {
    await page.context().close();
  }
}


async function timed(label: string, action: () => Promise<void>): Promise<Timing> {
  const start = Date.now();
  await action();
  return { timing: label, seconds: ((Date.now() - start) / 1000).toFixed(1) };
}

/** Slow 4G at 360 px: the home page, and each onboarding journey from the role screen to a usable first step. */
async function slow4g(browser: Browser): Promise<Timing[]> {
  await clearEmulators();
  const results: Timing[] = [];
  const page = await newPage(browser, 360, { geolocation: true });
  // Warm the dev server first, so compile time isn't counted as network time.
  for (const path of ["/", "/sign-in", "/onboarding/role", "/onboarding/work", "/onboarding/business"]) await page.goto(`${BASE}${path}`);
  await throttle(page);

  const home = PROD ?? BASE;
  const where = PROD ? "production build" : "dev server";
  results.push(await timed(`home: hero title on screen (${where})`, async () => {
    await page.goto(`${home}/`, { waitUntil: "commit" });
    await page.locator("h1").first().waitFor();
  }));
  results.push(await timed(`home: fully loaded, after the title (${where})`, () => page.waitForLoadState("load")));

  for (const [account, role, heading] of [["slow-thabo", "I'm looking for work", "About you"], ["slow-lerato", "I run a business", "About your business"]] as const) {
    await page.goto(`${BASE}/sign-in`);
    await signIn(page, account);
    await pathIs(page, "/onboarding/role");
    await page.getByRole("button", { name: role }).waitFor();
    results.push(await timed(`${role}: tap to step 1 ready (dev server)`, async () => {
      await page.getByRole("button", { name: role }).click();
      await page.getByRole("heading", { name: heading }).waitFor();
    }));
    results.push(await timed(`${role}: reload step 1 to ready (dev server)`, async () => {
      await page.reload({ waitUntil: "commit" });
      await page.getByRole("heading", { name: heading }).waitFor();
    }));
    await page.getByRole("button", { name: "Sign out" }).first().click();
    await pathIs(page, "/sign-in");
  }
  await page.context().close();
  return results;
}

run(async () => {
  const browser = await launchEdge();
  try {
    const phone = await walk(browser, 360);
    const desktop = await walk(browser, 1280);
    const recs = [phone.rec, desktop.rec];
    const timings = [...(await slow4g(browser)), ...phone.timings];
    console.table(recs.flatMap((rec) => rec.rows));
    console.table(timings);
    console.log(`Screenshots: ${SHOTS}`);
    const failures = recs.flatMap((rec) => rec.failures);
    if (failures.length > 0) throw new Error(`${failures.length} problems:\n${failures.join("\n")}`);
    const screens = recs.reduce((count, rec) => count + rec.rows.length, 0);
    console.log(`Every check passed in Edge at 360 and 1280 px: ${screens} screens, axe clean, skeletons in place.`);
  } finally {
    await browser.close();
  }
});
