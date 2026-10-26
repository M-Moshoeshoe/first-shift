import { mkdirSync } from "node:fs";
import { join } from "node:path";
import { chromium, type Page } from "playwright-core";

/**
 * The whole loop on a running site, as the judges' screenshots and video
 * show it: Sipho posts, Thabo finds and applies, Sipho offers, Thabo
 * accepts, the door, paying, Received, the reference and the record. Signs
 * in with the demo cards, so run npm run demo:reset against the same site
 * first. Tools only; app code never imports scripts/.
 *
 *   WALK_OUT=<folder> npx tsx scripts/walkthrough.ts shots    eight screenshots, 390 by 844 at 2x
 *   WALK_OUT=<folder> npx tsx scripts/walkthrough.ts video    the loop with a title card and step captions
 *
 * WALK_BASE_URL picks the site (the live one by default).
 */
const BASE = process.env.WALK_BASE_URL ?? "https://firstshiftza.netlify.app";
const OUT = process.env.WALK_OUT ?? "";
const MODE = process.argv[2] === "video" ? "video" : "shots";
const VIEWPORT = { width: 390, height: 844 };
const SENTENCE = "I need someone to pack stock and serve customers at my phone shop on Saturday";

const TITLE_CARD = `<body style="margin:0;height:100vh;display:flex;flex-direction:column;justify-content:center;gap:16px;padding:0 28px;background:#fff;color:#0f2d24;font-family:system-ui,sans-serif">
<h1 style="margin:0;font-size:34px;line-height:40px">First Shift demo.</h1>
<p style="margin:0;font-size:19px;line-height:27px">Step captions appear at the top of the screen.</p></body>`;

/** Shown at the top of every screen in the video, kept there across page loads. */
function captionScript(): void {
  const draw = () => {
    const text = sessionStorage.getItem("walk-caption");
    let bar = document.getElementById("walk-caption");
    if (!text) return bar?.remove();
    if (!bar) {
      bar = document.createElement("div");
      bar.id = "walk-caption";
      bar.style.cssText = "position:fixed;top:0;left:0;right:0;z-index:2147483647;pointer-events:none;background:#0f2d24;color:#fff;font:600 15px/20px system-ui,sans-serif;padding:12px 16px";
      document.documentElement.append(bar);
    }
    if (bar.textContent !== text) bar.textContent = text;
  };
  setInterval(draw, 100);
}

async function caption(page: Page, text: string): Promise<void> {
  if (MODE !== "video") return;
  await page.evaluate((value) => sessionStorage.setItem("walk-caption", value), text);
  await page.waitForTimeout(1200); // long enough to read before the step moves on
}

/** Every placeholder gone and every photo drawn, so a screenshot shows the screen as it settles. */
async function settled(page: Page): Promise<void> {
  await page.waitForFunction(() => document.querySelectorAll(".skeleton").length === 0 && [...document.images].every((image) => image.complete), undefined, { timeout: 30_000 });
  await page.waitForTimeout(500);
}

async function shot(page: Page, name: string): Promise<void> {
  if (MODE !== "shots") return;
  await settled(page);
  await page.screenshot({ path: join(OUT, `${name}.png`) });
  console.log(`screenshot: ${name}`);
}

async function signInAs(page: Page, who: "Sipho" | "Thabo"): Promise<void> {
  if ((await page.getByRole("button", { name: "Sign out" }).count()) > 0) {
    await page.getByRole("button", { name: "Sign out" }).first().click();
  }
  if (!page.url().endsWith("/sign-in")) await page.goto(`${BASE}/sign-in`);
  await page.getByRole("button", { name: who === "Sipho" ? /Sipho, a business owner/ : /Thabo, looking for work/ }).click();
  await page.waitForURL(who === "Sipho" ? /\/business/ : /\/work/, { timeout: 60_000 });
  await page.locator("main h1").first().waitFor();
}

async function post(page: Page): Promise<string> {
  await caption(page, "1. Sipho posts a tryout in one sentence");
  await signInAs(page, "Sipho");
  await page.getByRole("link", { name: "Post a tryout" }).first().click();
  await page.getByLabel("What do you need help with?").pressSequentially(SENTENCE, { delay: MODE === "video" ? 25 : 0 });
  await page.getByRole("button", { name: "Draft my tryout" }).click();
  await caption(page, "2. AI drafts it; our rules check pay, hours and notice");
  await page.getByRole("heading", { name: "Check your tryout" }).waitFor({ timeout: 90_000 });
  await page.getByLabel("Pay per hour").fill("35");
  // Six hours, so a later tryout together would reach the 24-hour line (the claims check uses it).
  await page.locator("label", { hasText: /^6$/ }).click();
  const title = await page.getByLabel("Title").inputValue();
  await page.locator("label", { hasText: "I'll be on site to supervise." }).click();
  await shot(page, "1-post");
  await page.getByRole("button", { name: "Post tryout" }).click();
  await page.getByText("Your tryout is live").waitFor({ timeout: 90_000 });
  await page.waitForTimeout(MODE === "video" ? 1500 : 0);
  return title;
}

async function find(page: Page, title: string): Promise<void> {
  await caption(page, "3. Thabo sees nearby tryouts, with the taxi fare");
  await signInAs(page, "Thabo");
  const gotIt = page.getByRole("button", { name: "Got it" });
  if ((await gotIt.count()) > 0) await gotIt.click();
  await page.locator('a[href^="/work/tryouts/"]').first().waitFor();
  await shot(page, "2-find");
  await page.waitForTimeout(MODE === "video" ? 1500 : 0);
  await caption(page, "4. He applies in one tap");
  await page.getByRole("link", { name: title }).first().click();
  await page.getByRole("button", { name: "Apply" }).click();
  await page.getByRole("heading", { name: "You've applied" }).waitFor();
}

async function shortlist(page: Page): Promise<void> {
  await caption(page, "5. Sipho gets a ranked shortlist with reasons");
  await signInAs(page, "Sipho");
  await page.getByRole("link", { name: /Phone shop helper/ }).first().click();
  await page.getByRole("heading", { name: "Who applied" }).waitFor();
  await shot(page, "3-shortlist");
  await page.getByRole("button", { name: /Thabo/ }).first().click();
  await page.getByRole("dialog").getByRole("button", { name: "Offer the tryout to Thabo" }).click();
  await page.getByText("Offered to Thabo.").waitFor();
}

async function book(page: Page): Promise<string> {
  await caption(page, "6. Thabo accepts: a booking with a check-in code");
  await signInAs(page, "Thabo");
  await page.goto(`${BASE}/work/applications`);
  await page.getByText("Offered to you").first().click();
  await page.getByRole("button", { name: "Accept" }).click();
  await page.getByRole("link", { name: "See your booking" }).click();
  await page.getByRole("heading", { name: "Your check-in code" }).waitFor();
  const code = (await page.locator("p.text-4xl").innerText()).replace(/\s+/g, "");
  await shot(page, "4-booking");
  await page.waitForTimeout(MODE === "video" ? 1500 : 0);
  return code;
}

async function door(page: Page, code: string): Promise<string> {
  const bookingPath = new URL(page.url()).pathname;
  await caption(page, "7. On the day, Sipho checks face, ID and code");
  await signInAs(page, "Sipho");
  await page.goto(`${BASE}${bookingPath}`);
  await page.getByRole("button", { name: "Skip to the day" }).click();
  await page.getByRole("heading", { name: "At the door" }).waitFor();
  await page.getByRole("button", { name: "Check in Thabo" }).click();
  await page.getByText("Check all three at the door", { exact: false }).waitFor();
  for (const label of ["Their face matches the photo", "The name on their ID card is Thabo", "The last four digits of their ID number are"]) await page.locator("label", { hasText: label }).click();
  await page.getByLabel("Their check-in code").fill(code);
  await shot(page, "5-door");
  await page.getByRole("button", { name: "Check in Thabo" }).click();
  await page.getByText("Checked in at", { exact: false }).waitFor();
  return bookingPath;
}

async function pay(page: Page): Promise<void> {
  await caption(page, "8. Check-out works out the pay; Sipho pays Thabo directly");
  await page.locator("label", { hasText: "We finished the work" }).click();
  for (const id of ["check-out-onTime-yes", "check-out-didTheWork-yes", "check-out-wouldHireAgain-yes"]) await page.locator(`label[for="${id}"]`).click();
  await page.getByRole("button", { name: "Check out" }).click();
  await page.getByText(/You owe Thabo R/).waitFor();
  await page.locator('label[for="pay-method-ewallet"]').click();
  await page.getByLabel("Payment reference").fill("FS THABO SAT");
  await shot(page, "6-paid");
  await page.getByRole("button", { name: "Mark as paid", exact: true }).click();
  await page.getByText("Waiting for Thabo to confirm", { exact: false }).waitFor();
}

async function reference(page: Page, bookingPath: string): Promise<void> {
  await caption(page, "9. Thabo checks his balance and taps Received");
  await signInAs(page, "Thabo");
  await page.goto(`${BASE}${bookingPath}`);
  await page.getByRole("button", { name: "Received", exact: true }).click();
  await caption(page, "10. A reference written from Sipho's three answers");
  await page.getByText("Written with AI from the business's answers").waitFor({ timeout: 90_000 });
  await shot(page, "7-reference");
  await page.getByRole("button", { name: "Add to my record" }).click();
  await page.getByText("Added to your record.", { exact: false }).waitFor();
}

async function record(page: Page): Promise<void> {
  await caption(page, "11. Add the verified record to a CV");
  await page.goto(`${BASE}/work/record`);
  await page.getByText("Paid, confirmed by both").first().waitFor();
  await shot(page, "8-record");
  await page.getByRole("button", { name: "Copy for my CV" }).click();
  await page.getByText("Copied. Paste it into your CV or job application.").waitFor();
  await page.waitForTimeout(MODE === "video" ? 2500 : 0);
}

async function main(): Promise<void> {
  if (!OUT) throw new Error("Set WALK_OUT to the folder for the screenshots or the video.");
  mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch({ channel: "msedge" });
  const context = await browser.newContext({
    viewport: VIEWPORT,
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
    permissions: ["clipboard-read", "clipboard-write"],
    ...(MODE === "video" ? { recordVideo: { dir: OUT, size: { width: VIEWPORT.width * 2, height: VIEWPORT.height * 2 } } } : {}),
  });
  if (MODE === "video") await context.addInitScript(captionScript);
  const page = await context.newPage();
  page.setDefaultTimeout(45_000);
  try {
    if (MODE === "video") {
      await page.setContent(TITLE_CARD);
      await page.waitForTimeout(4000);
    }
    await page.goto(`${BASE}/sign-in`);
    const title = await post(page);
    await find(page, title);
    await shortlist(page);
    const code = await book(page);
    const bookingPath = await door(page, code);
    await pay(page);
    await reference(page, bookingPath);
    await record(page);
  } catch (error) {
    await page.screenshot({ path: join(OUT, "failure.png") }).catch(() => undefined);
    console.error(`Failed at ${page.url()}`);
    throw error;
  } finally {
    const video = page.video();
    await context.close();
    if (video) console.log(`video: ${await video.path()}`);
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
