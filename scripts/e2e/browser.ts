import { mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { getFirestore } from "firebase-admin/firestore";
import { chromium, type Page } from "playwright-core";
import { AREAS } from "../../src/config/areas";
import { adminApp, clearEmulators, requireEmulators, run } from "./session";

/**
 * The routing paths and both onboarding forms, walked like a real person in
 * Microsoft Edge at 360 px, against the dev server and the emulators. Signs
 * in with the test-only emulator sign-in, which exists only in development.
 *
 *   npm run emulators   then   npm run dev   then   npm run e2e:browser   (emulator settings from README)
 */
requireEmulators(["FIRESTORE_EMULATOR_HOST", "FIREBASE_AUTH_EMULATOR_HOST", "FIREBASE_STORAGE_EMULATOR_HOST"]);

const BASE = process.env.E2E_BASE_URL ?? "http://localhost:3000";
const SHOTS = join(tmpdir(), "first-shift-e2e");
const ID_NUMBER = "0001155800087"; // a valid adult citizen ID, born 2000-01-15
const PIN = { latitude: -25.99634, longitude: 28.22711, accuracy: 20 }; // Tembisa

let step = 0;
const results: { step: string; ok: string }[] = [];

/** Records a check, with a screenshot of the screen as it was. */
async function check(page: Page, name: string): Promise<void> {
  step += 1;
  const label = `${String(step).padStart(2, "0")} ${name}`;
  // Skeletons have no heading: wait for the real screen before judging it.
  await page.locator("h1").first().waitFor();
  const width = await page.evaluate(() => document.documentElement.scrollWidth);
  if (width > 360) throw new Error(`${label}: the page scrolls sideways (${width} px wide at 360 px)`);
  await page.screenshot({ path: join(SHOTS, `${label.replace(/[^a-z0-9]+/gi, "-")}.png`), fullPage: true });
  results.push({ step: label, ok: new URL(page.url()).pathname });
}

/** Opens path and expects to be sent to (or kept on) expected. */
async function visit(page: Page, path: string, expected: string): Promise<void> {
  await page.goto(`${BASE}${path}`);
  await page.waitForURL((url) => url.pathname === expected);
  // The gate redirects after the profile loads; give it a moment to settle on the final screen.
  await page.waitForLoadState("networkidle");
  if (new URL(page.url()).pathname !== expected) throw new Error(`${path}: expected ${expected}, got ${page.url()}`);
  await check(page, `open ${path}, land on ${expected}`);
}

async function signIn(page: Page, account: string, expected: string): Promise<void> {
  await page.goto(`${BASE}/sign-in`);
  await page.getByLabel("Test account (emulators only)").fill(account);
  await page.getByRole("button", { name: "Sign in as test account" }).click();
  await page.waitForURL((url) => url.pathname === expected);
  await check(page, `sign in as ${account}, land on ${expected}`);
}

async function signOut(page: Page): Promise<void> {
  await page.getByRole("button", { name: "Sign out" }).click();
  await page.waitForURL((url) => url.pathname === "/sign-in");
  await check(page, "sign out, land on /sign-in");
}

async function choosePhoto(page: Page, name: string): Promise<void> {
  // A screenshot of the page is a real image for the browser to resize, like a phone photo.
  const buffer = await page.screenshot();
  await page.locator('input[type="file"]:not([capture])').setInputFiles({ name, mimeType: "image/png", buffer });
  await page.getByAltText("The photo you chose").waitFor();
}

/** The area field suggests every known area, and a typed variant is stored under the official name. */
async function expectArea(page: Page, fieldId: string): Promise<void> {
  const options = await page.locator(`#${fieldId}-areas option`).count();
  if (options !== AREAS.length) throw new Error(`#${fieldId} suggests ${options} areas, expected ${AREAS.length}`);
}

/** The emulator gives each test account its own uid, so find the record by what was typed. */
async function expectStoredArea(collection: string, field: string, value: string, expected: string): Promise<void> {
  const found = await getFirestore(adminApp()).collection(collection).where(field, "==", value).get();
  const areas = found.docs.map((doc) => doc.get("area"));
  if (areas.length !== 1 || areas[0] !== expected) throw new Error(`${collection} ${value}: stored area ${JSON.stringify(areas)}, expected "${expected}"`);
  results.push({ step: `   stored area for ${value}`, ok: expected });
}

async function youngPerson(page: Page): Promise<void> {
  await signIn(page, "e2e-thabo", "/onboarding/role");
  for (const path of ["/work", "/business", "/onboarding/work"]) await visit(page, path, "/onboarding/role");

  await page.getByRole("button", { name: "I'm looking for work" }).click();
  await page.waitForURL((url) => url.pathname === "/onboarding/work");
  await check(page, "choose I'm looking for work");
  for (const path of ["/work", "/business", "/onboarding/role", "/onboarding/business"]) await visit(page, path, "/onboarding/work");

  await page.getByLabel("First name").fill("Thabo");
  await expectArea(page, "work-area");
  await page.getByLabel("Area", { exact: true }).fill("ivory prk ext 2");
  // The real checkbox is visually hidden behind its square, so tap the label as a person would.
  await page.locator("label", { hasText: "Saturdays" }).click();
  if (!(await page.getByLabel("Saturdays").isChecked())) throw new Error("tapping Saturdays didn't tick it");
  await page.getByLabel("Cellphone number for payments").fill("082 123 4567");
  await check(page, "young person step 1 filled");
  await page.getByRole("button", { name: "Next" }).click();
  await page.getByLabel("ID number").fill(ID_NUMBER);
  await check(page, "young person step 2 filled");
  await page.getByRole("button", { name: "Next" }).click();
  await page.getByRole("heading", { name: "Your photo" }).waitFor();
  await choosePhoto(page, "face.png");
  await check(page, "young person step 3 photo chosen");
  await page.getByRole("button", { name: "Save my profile" }).click();
  await page.getByText("Profile done").waitFor();
  await check(page, "young person Profile done stamp");
  await page.waitForURL((url) => url.pathname === "/work");
  await page.getByRole("heading", { name: "Hi Thabo" }).waitFor();
  await check(page, "young person home");
  await expectStoredArea("users", "firstName", "Thabo", "Ivory Park");

  for (const path of ["/onboarding/work", "/onboarding/role", "/sign-in", "/business"]) await visit(page, path, "/work");
  await signOut(page);
  await visit(page, "/work", "/sign-in");
}

async function business(page: Page): Promise<void> {
  await signIn(page, "e2e-lerato", "/onboarding/role");
  await page.getByRole("button", { name: "I run a business" }).click();
  await page.waitForURL((url) => url.pathname === "/onboarding/business");

  await page.getByLabel("Business name").fill("Lerato's Spaza");
  await expectArea(page, "business-area");
  await page.getByLabel("Area", { exact: true }).fill("thembisa");
  await page.getByLabel("Opening hours").fill("Monday to Saturday, 8:00 to 17:00");
  await check(page, "business step 1 filled");
  await page.getByRole("button", { name: "Next" }).click();
  await page.getByRole("heading", { name: "Your premises pin" }).waitFor();
  await visit(page, "/business", "/onboarding/business");
  await page.getByRole("button", { name: "Use my location" }).click();
  await page.getByRole("button", { name: "Next" }).click();
  await page.getByRole("heading", { name: "Your shopfront" }).waitFor();
  await choosePhoto(page, "shopfront.png");
  await check(page, "business step 3 photo chosen");
  await page.getByRole("button", { name: "Save my business" }).click();
  await page.getByText("Profile done").waitFor();
  await check(page, "business Profile done stamp");
  await page.waitForURL((url) => url.pathname === "/business");
  await page.getByRole("heading", { name: "Lerato's Spaza" }).waitFor();
  await check(page, "business home");
  await expectStoredArea("businesses", "name", "Lerato's Spaza", "Tembisa");

  for (const path of ["/onboarding/business", "/onboarding/role", "/work"]) await visit(page, path, "/business");
  await signOut(page);
}

run(async () => {
  await clearEmulators();
  mkdirSync(SHOTS, { recursive: true });
  const browser = await chromium.launch({ channel: "msedge" });
  try {
    const context = await browser.newContext({
      viewport: { width: 360, height: 740 },
      deviceScaleFactor: 2,
      isMobile: true,
      hasTouch: true,
      permissions: ["geolocation"],
      geolocation: PIN,
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
    const consoleLines: string[] = [];
    page.on("console", (message) => {
      if (message.type() === "error" || message.type() === "warning") consoleLines.push(`${message.type()}: ${message.text()}`);
    });

    try {
      await visit(page, "/work", "/sign-in");
      await youngPerson(page);
      await business(page);
      // A finished profile survives signing out: straight home, no onboarding.
      await signIn(page, "e2e-thabo", "/work");
    } catch (error) {
      await page.screenshot({ path: join(SHOTS, "failure.png"), fullPage: true });
      console.error(`Failed at ${page.url()} after: ${results.at(-1)?.step ?? "nothing"}. Screenshot: ${join(SHOTS, "failure.png")}`);
      console.error(consoleLines.join("\n"));
      throw error;
    }
  } finally {
    await browser.close();
  }
  console.table(results);
  console.log(`Every check passed in Edge at 360 px. Screenshots: ${SHOTS}`);
});
