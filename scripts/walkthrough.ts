import { mkdirSync } from "node:fs";
import { join } from "node:path";
import { chromium, type Locator, type Page } from "playwright-core";
import { encode, loadTimeline, saveTimeline, startScreencast, type PaceMark } from "./walkthroughVideo";

/**
 * The whole loop on a running site, as the judges' screenshots and video
 * show it: Sipho posts, Thabo finds and applies, Sipho offers, Thabo
 * accepts, the door, paying, Received, the reference and the record. Signs
 * in with the demo cards, so run npm run demo:reset against the same site
 * first. Tools only; app code never imports scripts/.
 *
 *   WALK_OUT=<folder> npx tsx scripts/walkthrough.ts shots    eight screenshots, 390 by 844 at 2x
 *   WALK_OUT=<folder> FFMPEG=<ffmpeg.exe> npx tsx scripts/walkthrough.ts video    first-shift-demo.mp4: a title card, then the loop with step captions
 *
 * WALK_BASE_URL picks the site (the live one by default). Each screenshot is
 * framed on the part of the screen it is about, once every photo has drawn.
 */
const BASE = process.env.WALK_BASE_URL ?? "https://firstshiftza.netlify.app";
const OUT = process.env.WALK_OUT ?? "";
const MODE = process.argv[2] === "video" ? "video" : process.argv[2] === "encode" ? "encode" : "shots";
const VIEWPORT = { width: 390, height: 844 };
const SENTENCE = "I need someone to unpack boxes and pack stock onto the shelves at my phone shop on Saturday";
const TITLE_SECONDS = 4;
const MAX_SECONDS = 88;

// Served from the site's own address, so the screencast keeps running when the loop begins.
const TITLE_CARD = `<!doctype html><meta name="viewport" content="width=device-width"><body style="margin:0;height:100vh;display:flex;flex-direction:column;justify-content:center;gap:20px;padding:0 28px;background:#fff;color:#0f2d24;font-family:system-ui,-apple-system,'Segoe UI',sans-serif">
<img src="/icons/header_logo.png" alt="First Shift" style="width:220px;height:auto">
<h1 style="margin:0;font-size:32px;line-height:38px;letter-spacing:-0.02em">First Shift demo.</h1>
<p style="margin:0;font-size:19px;line-height:27px;color:#43584f">Step captions appear at the top of the screen.</p></body>`;

/** Shown at the top of every screen in the video, kept there across page loads. */
function captionScript(): void {
  const draw = () => {
    const text = sessionStorage.getItem("walk-caption");
    let bar = document.getElementById("walk-caption");
    if (!text) return bar?.remove();
    if (!bar) {
      bar = document.createElement("div");
      bar.id = "walk-caption";
      bar.style.cssText = "position:fixed;top:0;left:0;right:0;z-index:2147483647;pointer-events:none;background:#0f2d24;color:#fff;font:600 16px/22px var(--font-archivo),system-ui,sans-serif;padding:14px 20px";
      document.documentElement.append(bar);
    }
    if (bar.textContent !== text) bar.textContent = text;
  };
  setInterval(draw, 100);
}

/**
 * How fast this stretch plays in the video: 1 for what a viewer reads or
 * watches (captions, held screens, typing), faster for waiting on the
 * network, so loading states still show but never drag.
 */
const marks: PaceMark[] = [];
const READ = 1;
const ACT = 3;
const WAIT = 6;
const pace = (speed: number) => void marks.push({ at: Date.now() / 1000, speed });

async function caption(page: Page, text: string): Promise<void> {
  if (MODE !== "video") return;
  pace(READ);
  await page.evaluate((value) => sessionStorage.setItem("walk-caption", value), text);
  await page.waitForTimeout(1800); // long enough to read before the step moves on
  pace(ACT);
}

/** Every placeholder gone and every photo drawn, so a screenshot shows the screen as it settles. */
async function settled(page: Page): Promise<void> {
  await page.waitForFunction(() => document.querySelectorAll(".skeleton").length === 0 && [...document.images].every((image) => image.complete), undefined, { timeout: 30_000 });
  await page.waitForTimeout(500);
}

/** Scrolls so target sits just under the top edge, the way a person would read that part of the screen. */
async function frame(page: Page, target: Locator, gap = 16): Promise<void> {
  await target.first().evaluate((element, offset) => window.scrollTo({ top: element.getBoundingClientRect().top + window.scrollY - offset, behavior: "instant" }), gap);
}

/** A screenshot framed on target; in the video, the same view held long enough to read. */
async function shot(page: Page, name: string, target: Locator | null, gap = 16): Promise<void> {
  await settled(page);
  if (target) await frame(page, target, MODE === "video" ? gap + 50 : gap);
  else await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
  if (MODE === "video") {
    pace(READ);
    await page.waitForTimeout(2200);
    return pace(ACT);
  }
  await page.waitForTimeout(300);
  await page.screenshot({ path: join(OUT, `${name}.png`) });
  console.log(`screenshot: ${name}`);
}

async function signInAs(page: Page, who: "Sipho" | "Thabo"): Promise<void> {
  pace(WAIT);
  if ((await page.getByRole("button", { name: "Sign out" }).count()) > 0) {
    await page.getByRole("button", { name: "Sign out" }).first().click();
    await page.waitForURL(/\/sign-in/, { timeout: 30_000 });
  }
  if (!page.url().includes("/sign-in")) await page.goto(`${BASE}/sign-in`);
  const card = page.getByRole("button", { name: who === "Sipho" ? /Sipho, a business owner/ : /Thabo, looking for work/ });
  await card.waitFor();
  await card.click();
  await page.waitForURL(who === "Sipho" ? /\/business/ : /\/work/, { timeout: 60_000 });
  await page.locator("main h1").first().waitFor();
  pace(ACT);
}

async function post(page: Page): Promise<string> {
  await caption(page, "Sipho posts a tryout in one sentence");
  await signInAs(page, "Sipho");
  await page.getByRole("link", { name: "Post a tryout" }).first().click();
  pace(READ);
  await page.getByLabel("What do you need help with?").pressSequentially(SENTENCE, { delay: MODE === "video" ? 30 : 0 });
  await page.getByRole("button", { name: "Draft my tryout" }).click();
  await caption(page, "AI drafts it; our rules check pay, hours and notice");
  pace(WAIT);
  await page.getByRole("heading", { name: "Check your tryout" }).waitFor({ timeout: 90_000 });
  pace(ACT);
  await page.getByLabel("Pay per hour").fill("35");
  // Six hours, so a later tryout together would reach the 24-hour line (the claims check uses it).
  await page.locator("label", { hasText: /^6$/ }).click();
  const title = await page.getByLabel("Title").inputValue();
  await page.locator("label", { hasText: "I'll be on site to supervise." }).click();
  await shot(page, "post", page.getByRole("heading", { name: "Check your tryout" }));
  await page.getByRole("button", { name: "Post tryout" }).click();
  pace(WAIT);
  await page.getByText("Your tryout is live").waitFor({ timeout: 90_000 });
  pace(READ);
  await page.waitForTimeout(MODE === "video" ? 1500 : 0);
  return title;
}

async function find(page: Page, title: string): Promise<void> {
  await caption(page, "Thabo sees nearby tryouts, with the taxi fare");
  await signInAs(page, "Thabo");
  const gotIt = page.getByRole("button", { name: "Got it" });
  if ((await gotIt.count()) > 0) await gotIt.click();
  await page.locator('a[href^="/work/tryouts/"]').first().waitFor();
  await shot(page, "find", page.getByRole("heading", { name: /^Tryouts near/ }));
  await caption(page, "He applies in one tap");
  await page.getByRole("link", { name: title }).first().click();
  await page.getByRole("button", { name: "Apply" }).click();
  await page.getByRole("heading", { name: "You've applied" }).waitFor();
}

async function shortlist(page: Page): Promise<void> {
  await caption(page, "Sipho gets a ranked shortlist with reasons");
  await signInAs(page, "Sipho");
  await page.getByRole("link", { name: /Phone shop helper/ }).first().click();
  await page.getByRole("heading", { name: "Who applied" }).waitFor();
  await shot(page, "shortlist", page.getByText(/^Your shortlist/));
  await page.getByRole("button", { name: /Thabo/ }).first().click();
  await page.getByRole("dialog").getByRole("button", { name: "Offer the tryout to Thabo" }).click();
  await page.getByText("Offered to Thabo.").waitFor();
}

async function book(page: Page): Promise<string> {
  await caption(page, "Thabo accepts: a booking with a check-in code");
  await signInAs(page, "Thabo");
  await page.goto(`${BASE}/work/applications`);
  await page.getByText("Offered to you").first().click();
  await page.getByRole("button", { name: "Accept" }).click();
  await page.getByRole("link", { name: "See your booking" }).click();
  await page.getByRole("heading", { name: "Your check-in code" }).waitFor();
  const code = (await page.locator("p.text-4xl").innerText()).replace(/\s+/g, "");
  await shot(page, "booking", page.locator("main h1"));
  return code;
}

async function door(page: Page, code: string): Promise<string> {
  const bookingPath = new URL(page.url()).pathname;
  await caption(page, "On the day, Sipho checks face, ID and code");
  await signInAs(page, "Sipho");
  await page.goto(`${BASE}${bookingPath}`);
  await page.getByRole("button", { name: "Skip to the day" }).click();
  await page.getByRole("heading", { name: "At the door" }).waitFor();
  for (const label of ["Their face matches the photo", "The name on their ID card is Thabo", "The last four digits of their ID number are"]) await page.locator("label", { hasText: label }).click();
  await page.getByLabel("Their check-in code").fill(code);
  // From the row with Thabo's face, so the photo the owner checks against is in the shot.
  await shot(page, "door", page.getByRole("button", { name: "View details" }), 24);
  await page.getByRole("button", { name: "Check in Thabo" }).click();
  await page.getByText("Checked in at", { exact: false }).waitFor();
  return bookingPath;
}

async function pay(page: Page): Promise<void> {
  await caption(page, "Check-out works out the pay; Sipho pays Thabo directly");
  await page.locator("label", { hasText: "We finished the work" }).click();
  for (const id of ["check-out-onTime-yes", "check-out-didTheWork-yes", "check-out-wouldHireAgain-yes"]) await page.locator(`label[for="${id}"]`).click();
  await page.getByRole("button", { name: "Check out" }).click();
  await page.getByText(/You owe Thabo R/).waitFor();
  await page.locator('label[for="pay-method-ewallet"]').click();
  await page.getByLabel("Payment reference").fill("FS THABO SAT");
  await shot(page, "paid", page.getByText(/You owe Thabo R/));
  await page.getByRole("button", { name: "Mark as paid", exact: true }).click();
  await page.getByText("Waiting for Thabo to confirm", { exact: false }).waitFor();
}

async function reference(page: Page, bookingPath: string): Promise<void> {
  await caption(page, "Thabo checks his balance and taps Received");
  await signInAs(page, "Thabo");
  await page.goto(`${BASE}${bookingPath}`);
  await page.getByRole("button", { name: "Received", exact: true }).click();
  await caption(page, "A reference written from Sipho's three answers");
  pace(WAIT);
  await page.getByText("Written with AI from the business's answers").waitFor({ timeout: 90_000 });
  pace(ACT);
  await shot(page, "reference", page.getByRole("heading", { name: "Your reference" }));
  await page.getByRole("button", { name: "Add to my record" }).click();
  await page.getByText("Added to your record.", { exact: false }).waitFor();
}

async function record(page: Page): Promise<void> {
  await caption(page, "Add the verified record to a CV");
  await page.goto(`${BASE}/work/record`);
  await page.getByText("Paid, confirmed by both").first().waitFor();
  await shot(page, "record", page.locator("main h1"));
  await page.getByRole("button", { name: "Copy for my CV" }).click();
  await page.getByText("Copied. Paste it into your CV or job application.").waitFor();
  await page.waitForTimeout(MODE === "video" ? 2500 : 0);
}

/** Encodes the last run's frames (timeline.json in WALK_OUT): after a video run, or alone with the encode argument. */
function writeVideo(): void {
  const out = join(OUT, "first-shift-demo.mp4");
  const { seconds, speed } = encode(loadTimeline(join(OUT, "timeline.json")), MAX_SECONDS, out, process.env.FFMPEG ?? "ffmpeg");
  console.log(`video: ${out}, ${seconds.toFixed(1)} s${speed > 1 ? `, sped up a further ${speed.toFixed(2)}x after the title` : ""}`);
}

async function main(): Promise<void> {
  if (!OUT) throw new Error("Set WALK_OUT to the folder for the screenshots or the video.");
  if (MODE === "encode") return writeVideo();
  mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch({ channel: "msedge" });
  const context = await browser.newContext({
    viewport: VIEWPORT,
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
    permissions: ["clipboard-read", "clipboard-write"],
  });
  if (MODE === "video") await context.addInitScript(captionScript);
  const page = await context.newPage();
  page.setDefaultTimeout(45_000);
  let screencast: Awaited<ReturnType<typeof startScreencast>> | null = null;
  let titleUntil = 0;
  try {
    if (MODE === "video") {
      await page.route(`${BASE}/walkthrough-title`, (route) => route.fulfill({ contentType: "text/html", body: TITLE_CARD }));
      await page.goto(`${BASE}/walkthrough-title`);
      await page.locator("img").waitFor();
      screencast = await startScreencast(page, join(OUT, "frames"), { width: VIEWPORT.width * 2, height: VIEWPORT.height * 2 });
      pace(READ);
      await page.waitForTimeout(TITLE_SECONDS * 1000);
      titleUntil = Date.now() / 1000;
      pace(WAIT);
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
    const caught = screencast ? await screencast.stop() : [];
    await context.close();
    await browser.close();
    if (caught.length > 0) {
      saveTimeline(join(OUT, "timeline.json"), { frames: caught, marks, titleUntil });
      writeVideo();
    }
  }
}

main().then(
  () => process.exit(0),
  (error: unknown) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  },
);
