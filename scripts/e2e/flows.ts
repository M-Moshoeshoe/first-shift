import { getFirestore } from "firebase-admin/firestore";
import type { Page } from "playwright-core";
import { AREAS } from "../../src/config/areas";
import { BASE, holdProfile, measureLayout, pathIs, signIn, type Recorder } from "./kit";
import { adminApp } from "./session";

const ID_NUMBER = "0001155800087"; // a valid adult citizen ID, born 2000-01-15

/** Opens path and expects to be sent to (or kept on) expected. */
export async function visit(rec: Recorder, page: Page, path: string, expected: string): Promise<void> {
  await page.goto(`${BASE}${path}`);
  await pathIs(page, expected);
  // The screen is ready when its heading is: a live Firestore listener means the network never goes quiet.
  await page.locator("main h1").first().waitFor();
  if (new URL(page.url()).pathname !== expected) throw new Error(`${path}: expected ${expected}, got ${page.url()}`);
  await rec.check(page, `open ${path}, land on ${expected}`);
}

/**
 * The loading skeleton of path, then the real screen: the title block must be
 * the same height and the content under it must start in the same place, to
 * within 2 px, so nothing jumps when the profile arrives.
 */
export async function skeleton(rec: Recorder, page: Page, path: string): Promise<void> {
  const release = await holdProfile(page);
  await page.goto(`${BASE}${path}`);
  await page.locator('[role="status"][aria-label="Loading your page"]').waitFor();
  const before = await measureLayout(page, "skeleton");
  await rec.check(page, `loading ${path}`, { heading: false });
  await release();
  await page.locator("main h1").first().waitFor();
  const after = await measureLayout(page, "real");
  const titleOff = Math.abs(before.title - after.title);
  const bodyOff = before.body !== null && after.body !== null ? Math.abs(before.body - after.body) : before.body === after.body ? 0 : Infinity;
  if (titleOff > 2 || bodyOff > 2) {
    rec.failures.push(`${rec.width} px, skeleton of ${path}: title ${before.title} vs ${after.title}, content starts ${before.body} vs ${after.body}`);
  }
}

/** The area field suggests every known area (a native datalist). */
async function expectAreaSuggestions(rec: Recorder, page: Page, fieldId: string): Promise<void> {
  const options = await page.locator(`#${fieldId}-areas option`).count();
  if (options !== AREAS.length) rec.failures.push(`${rec.width} px: #${fieldId} suggests ${options} areas, expected ${AREAS.length}`);
}

/** A typed variant is stored under the official name. The emulator gives each account its own uid, so find the record by what was typed. */
async function expectStoredArea(rec: Recorder, collection: string, field: string, value: string, expected: string): Promise<void> {
  const found = await getFirestore(adminApp()).collection(collection).where(field, "==", value).get();
  const areas = found.docs.map((doc) => doc.get("area"));
  if (areas.length !== 1 || areas[0] !== expected) rec.failures.push(`${rec.width} px: ${collection} ${value} stored area ${JSON.stringify(areas)}, expected "${expected}"`);
}

/** The profile fails to load: a heading, the reason, Try again and Sign out. Try again must recover once the server answers. */
async function profileError(rec: Recorder, page: Page, path: string): Promise<void> {
  const fail = (route: { request: () => { method: () => string }; fulfill: (r: object) => Promise<void>; continue: () => Promise<void> }) =>
    route.request().method() === "GET"
      ? route.fulfill({ status: 500, contentType: "application/json", body: JSON.stringify({ error: "server_error", message: "Something went wrong on our side. Try again in a minute." }) })
      : route.continue();
  await page.route("**/api/profile", fail);
  await page.goto(`${BASE}${path}`);
  await page.getByRole("heading", { name: "We couldn't load your profile" }).waitFor();
  await rec.check(page, `profile error on ${path}`);
  await page.unroute("**/api/profile", fail);
  await page.getByRole("button", { name: "Try again" }).click();
  await page.getByRole("heading", { name: "We couldn't load your profile" }).waitFor({ state: "detached" });
  await page.locator("main h1").first().waitFor();
  if (new URL(page.url()).pathname !== path) rec.failures.push(`${rec.width} px: Try again on ${path} ended on ${page.url()}`);
}

async function choosePhoto(page: Page, name: string): Promise<void> {
  // A screenshot of the page is a real image for the browser to resize, like a phone photo.
  const buffer = await page.screenshot();
  await page.locator('input[type="file"]:not([capture])').setInputFiles({ name, mimeType: "image/png", buffer });
  await page.getByAltText("The photo you chose").waitFor();
}

/** From the home page's "Find a paid tryout" to a finished young person profile. */
export async function youngPerson(rec: Recorder, page: Page): Promise<void> {
  await page.goto(`${BASE}/`);
  await rec.check(page, "home");
  await page.getByRole("link", { name: "Find a paid tryout" }).first().click();
  await pathIs(page, "/sign-in");
  await rec.check(page, "sign-in from Find a paid tryout");
  await signIn(page, "e2e-thabo");
  await pathIs(page, "/onboarding/role");
  await page.getByRole("button", { name: "I'm looking for work" }).waitFor();
  const highlighted = await page.getByRole("button", { name: "I'm looking for work" }).getAttribute("class");
  if (!highlighted?.includes("bg-primary")) rec.failures.push(`${rec.width} px: the role screen didn't highlight the intended choice`);
  await rec.check(page, "role screen, intent work highlighted");
  for (const path of ["/work", "/business", "/onboarding/work"]) await visit(rec, page, path, "/onboarding/role");
  await skeleton(rec, page, "/onboarding/role");

  await page.getByRole("button", { name: "I'm looking for work" }).click();
  await pathIs(page, "/onboarding/work");
  await page.getByRole("heading", { name: "About you" }).waitFor();
  for (const path of ["/work", "/business", "/onboarding/role"]) await visit(rec, page, path, "/onboarding/work");
  await skeleton(rec, page, "/onboarding/work");

  await page.getByRole("button", { name: "Next" }).click();
  await rec.check(page, "young person step 1 errors");
  await expectAreaSuggestions(rec, page, "work-area");
  await page.getByLabel("First name").fill("Thabo");
  await page.getByLabel("Area", { exact: true }).fill("ivory prk ext 2");
  await page.locator("label", { hasText: "Saturdays" }).click();
  await page.getByLabel("Cellphone number for payments").fill("082 123 4567");
  await page.getByRole("button", { name: "Next" }).click();
  await page.getByLabel("ID number").fill(ID_NUMBER);
  await rec.check(page, "young person step 2");
  await page.getByRole("button", { name: "Next" }).click();
  await page.getByRole("heading", { name: "Your photo" }).waitFor();
  await page.getByRole("button", { name: "Back" }).click();
  await page.getByRole("heading", { name: "Your ID number" }).waitFor();
  await page.getByLabel("ID number").fill(ID_NUMBER);
  await page.getByRole("button", { name: "Next" }).click();
  await page.getByRole("heading", { name: "Your photo" }).waitFor();
  await choosePhoto(page, "face.png");
  await rec.check(page, "young person step 3, after Back and Next");
  await page.getByRole("button", { name: "Save my profile" }).click();
  await page.getByText("Profile done").waitFor();
  await pathIs(page, "/work");
  await page.getByRole("heading", { name: "Hi Thabo" }).waitFor();
  await rec.check(page, "young person home");
  await expectStoredArea(rec, "users", "firstName", "Thabo", "Ivory Park");
  await skeleton(rec, page, "/work");
  await profileError(rec, page, "/work");
  for (const path of ["/onboarding/work", "/onboarding/role", "/sign-in", "/business"]) await visit(rec, page, path, "/work");
  await page.getByRole("button", { name: "Sign out" }).first().click();
  await pathIs(page, "/sign-in");
}

/** From the home page's "Post a tryout" to a finished business profile, using Back on steps 2 and 3. */
export async function business(rec: Recorder, page: Page): Promise<void> {
  await page.goto(`${BASE}/`);
  await page.getByRole("link", { name: "Post a tryout" }).first().click();
  await pathIs(page, "/sign-in");
  await signIn(page, "e2e-lerato");
  await pathIs(page, "/onboarding/role");
  await page.getByRole("button", { name: "I run a business" }).click();
  await pathIs(page, "/onboarding/business");
  await page.getByRole("heading", { name: "About your business" }).waitFor();
  await skeleton(rec, page, "/onboarding/business");
  await expectAreaSuggestions(rec, page, "business-area");
  await page.getByLabel("Business name").fill("Lerato's Spaza");
  await page.getByLabel("Area", { exact: true }).fill("thembisa");
  await page.getByLabel("Opening hours").fill("Monday to Saturday, 8:00 to 17:00");
  await page.getByRole("button", { name: "Next" }).click();
  await page.getByRole("heading", { name: "Your premises pin" }).waitFor();
  await page.getByRole("button", { name: "Back" }).click();
  await page.getByRole("heading", { name: "About your business" }).waitFor();
  await page.getByRole("button", { name: "Next" }).click();
  await page.getByRole("heading", { name: "Your premises pin" }).waitFor();
  await page.getByRole("button", { name: "Use my location" }).click();
  await page.getByRole("button", { name: "Next" }).click();
  await page.getByRole("heading", { name: "Your shopfront" }).waitFor();
  await page.getByRole("button", { name: "Back" }).click();
  await page.getByRole("heading", { name: "Your premises pin" }).waitFor();
  await rec.check(page, "business step 2, after Back");
  await page.getByRole("button", { name: "Next" }).click();
  await choosePhoto(page, "shopfront.png");
  await rec.check(page, "business step 3");
  await page.getByRole("button", { name: "Save my business" }).click();
  await page.getByText("Profile done").waitFor();
  await pathIs(page, "/business");
  await page.getByRole("heading", { name: "Lerato's Spaza" }).waitFor();
  await rec.check(page, "business home");
  await expectStoredArea(rec, "businesses", "name", "Lerato's Spaza", "Tembisa");
  await skeleton(rec, page, "/business");
  for (const path of ["/onboarding/business", "/onboarding/role", "/work"]) await visit(rec, page, path, "/business");
  await page.goto(`${BASE}/no-such-page`);
  await rec.check(page, "404");
  // The 404 page loads no auth code, so Sign out lives on the account screens.
  await page.goto(`${BASE}/business`);
  await page.getByRole("heading", { name: "Lerato's Spaza" }).waitFor();
  await page.getByRole("button", { name: "Sign out" }).first().click();
  await pathIs(page, "/sign-in");
}
