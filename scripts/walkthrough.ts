import { mkdirSync } from "node:fs";
import { join } from "node:path";
import { chromium, type Locator, type Page } from "playwright-core";
import { CAPTION_SCRIPT, encode, loadTimeline, saveTimeline, startScreencast, TITLE_CARD, type PaceMark } from "./walkthroughVideo";

/**
 * The whole loop on a running site, as the judges' screenshots and video
 * show it: Sipho posts, Thabo finds and applies, Sipho offers, Thabo
 * accepts, the door, paying, Received, the reference and the record. Signs
 * in with the demo cards, so run npm run demo:reset against the same site
 * first. Tools only; app code never imports scripts/.
 *
 *   WALK_OUT=<folder> npx tsx scripts/walkthrough.ts shots    eight screenshots, 390 by 844 at 2x
 *   WALK_OUT=<folder> FFMPEG=<ffmpeg.exe> npx tsx scripts/walkthrough.ts video    a title card, the home page, then the loop with step captions, at normal speed
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
const MAX_SECONDS = 89;
const VIDEO_NAME = "first-shift-demo-with-homepage.mp4";

/**
 * What each stretch of the video is, for cutting it (walkthroughVideo.ts):
 * everything plays at normal speed; "show" in full, "act" with still
 * moments trimmed, "wait" (the network) cut after its loading state shows.
 */
const marks: PaceMark[] = [];
const pace = (kind: PaceMark["kind"]) => void marks.push({ at: Date.now() / 1000, kind });

/** Waits for what the last tap loads, marked as waiting so the video can cut it short. */
async function loaded(target: Locator, timeout?: number): Promise<void> {
  pace("wait");
  await target.first().waitFor({ timeout });
  pace("act");
}

async function caption(page: Page, text: string): Promise<void> {
  if (MODE !== "video") return;
  pace("show");
  await page.evaluate((value) => sessionStorage.setItem("walk-caption", value), text);
  await page.waitForTimeout(1000); // it stays up for the whole step; this is the moment to start reading
  pace("act");
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
    pace("show");
    await page.waitForTimeout(2000);
    return pace("act");
  }
  await page.waitForTimeout(300);
  await page.screenshot({ path: join(OUT, `${name}.png`) });
  console.log(`screenshot: ${name}`);
}

async function signInAs(page: Page, who: "Sipho" | "Thabo"): Promise<void> {
  pace("wait");
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
  pace("act");
}

async function post(page: Page): Promise<string> {
  await caption(page, "Sipho posts a tryout in one sentence");
  await signInAs(page, "Sipho");
  await page.getByRole("link", { name: "Post a tryout" }).first().click();
  await loaded(page.getByLabel("What do you need help with?"));
  pace("show");
  await page.getByLabel("What do you need help with?").pressSequentially(SENTENCE, { delay: MODE === "video" ? 30 : 0 });
  await page.getByRole("button", { name: "Draft my tryout" }).click();
  await caption(page, "AI drafts it; our rules check pay, hours and notice");
  await loaded(page.getByRole("heading", { name: "Check your tryout" }), 90_000);
  await page.getByLabel("Pay per hour").fill("35");
  // Six hours, so a later tryout together would reach the 24-hour line (the claims check uses it).
  await page.locator("label", { hasText: /^6$/ }).click();
  const title = await page.getByLabel("Title").inputValue();
  await page.locator("label", { hasText: "I'll be on site to supervise." }).click();
  await shot(page, "post", page.getByRole("heading", { name: "Check your tryout" }));
  await page.getByRole("button", { name: "Post tryout" }).click();
  await loaded(page.getByText("Your tryout is live"), 90_000);
  pace("show");
  await page.waitForTimeout(MODE === "video" ? 1000 : 0);
  return title;
}

async function find(page: Page, title: string): Promise<void> {
  await caption(page, "Thabo sees nearby tryouts, with the taxi fare");
  await signInAs(page, "Thabo");
  const gotIt = page.getByRole("button", { name: "Got it" });
  if ((await gotIt.count()) > 0) await gotIt.click();
  await loaded(page.locator('a[href^="/work/tryouts/"]'));
  await shot(page, "find", page.getByRole("heading", { name: /^Tryouts near/ }));
  await caption(page, "He applies in one tap");
  await page.getByRole("link", { name: title }).first().click();
  await loaded(page.getByRole("button", { name: "Apply" }));
  await page.getByRole("button", { name: "Apply" }).click();
  await loaded(page.getByRole("heading", { name: "You've applied" }));
}

async function shortlist(page: Page): Promise<void> {
  await caption(page, "Sipho gets a ranked shortlist with reasons");
  await signInAs(page, "Sipho");
  await page.getByRole("link", { name: /Phone shop helper/ }).first().click();
  await loaded(page.getByRole("heading", { name: "Who applied" }));
  await shot(page, "shortlist", page.getByText(/^Your shortlist/));
  await page.getByRole("button", { name: /Thabo/ }).first().click();
  await page.getByRole("dialog").getByRole("button", { name: "Offer the tryout to Thabo" }).click();
  await loaded(page.getByText("Offered to Thabo."));
}

async function book(page: Page): Promise<string> {
  await caption(page, "Thabo accepts: a booking with a check-in code");
  await signInAs(page, "Thabo");
  await page.goto(`${BASE}/work/applications`);
  await loaded(page.getByText("Offered to you"));
  await page.getByText("Offered to you").first().click();
  await loaded(page.getByRole("button", { name: "Accept" }));
  await page.getByRole("button", { name: "Accept" }).click();
  await loaded(page.getByRole("link", { name: "See your booking" }));
  await page.getByRole("link", { name: "See your booking" }).click();
  await loaded(page.getByRole("heading", { name: "Your check-in code" }));
  const code = (await page.locator("p.text-4xl").innerText()).replace(/\s+/g, "");
  await shot(page, "booking", page.locator("main h1"));
  return code;
}

async function door(page: Page, code: string): Promise<string> {
  const bookingPath = new URL(page.url()).pathname;
  await caption(page, "On the day, Sipho checks face, ID and code");
  await signInAs(page, "Sipho");
  await page.goto(`${BASE}${bookingPath}`);
  await loaded(page.getByRole("button", { name: "Skip to the day" }));
  await page.getByRole("button", { name: "Skip to the day" }).click();
  await loaded(page.getByRole("heading", { name: "At the door" }));
  for (const label of ["Their face matches the photo", "The name on their ID card is Thabo", "The last four digits of their ID number are"]) await page.locator("label", { hasText: label }).click();
  await page.getByLabel("Their check-in code").fill(code);
  // From the row with Thabo's face, so the photo the owner checks against is in the shot.
  await shot(page, "door", page.getByRole("button", { name: "View details" }), 24);
  await page.getByRole("button", { name: "Check in Thabo" }).click();
  await loaded(page.getByText("Checked in at", { exact: false }));
  return bookingPath;
}

async function pay(page: Page): Promise<void> {
  await caption(page, "Check-out works out the pay; Sipho pays Thabo directly");
  await page.locator("label", { hasText: "We finished the work" }).click();
  for (const id of ["check-out-onTime-yes", "check-out-didTheWork-yes", "check-out-wouldHireAgain-yes"]) await page.locator(`label[for="${id}"]`).click();
  await page.getByRole("button", { name: "Check out" }).click();
  await loaded(page.getByText(/You owe Thabo R/));
  await page.locator('label[for="pay-method-ewallet"]').click();
  await page.getByLabel("Payment reference").fill("FS THABO SAT");
  await shot(page, "paid", page.getByText(/You owe Thabo R/));
  await page.getByRole("button", { name: "Mark as paid", exact: true }).click();
  await loaded(page.getByText("Waiting for Thabo to confirm", { exact: false }));
}

async function reference(page: Page, bookingPath: string): Promise<void> {
  await caption(page, "Thabo checks his balance and taps Received");
  await signInAs(page, "Thabo");
  await page.goto(`${BASE}${bookingPath}`);
  await loaded(page.getByRole("button", { name: "Received", exact: true }));
  await page.getByRole("button", { name: "Received", exact: true }).click();
  await caption(page, "A reference written from Sipho's three answers");
  await loaded(page.getByText("Written with AI from the business's answers"), 90_000);
  await shot(page, "reference", page.getByRole("heading", { name: "Your reference" }));
  await page.getByRole("button", { name: "Add to my record" }).click();
  await loaded(page.getByText("Added to your record.", { exact: false }));
}

async function record(page: Page): Promise<void> {
  await caption(page, "Add the verified record to a CV");
  await page.goto(`${BASE}/work/record`);
  await loaded(page.getByText("Paid, confirmed by both"));
  await shot(page, "record", page.locator("main h1"));
  await page.getByRole("button", { name: "Copy for my CV" }).click();
  await page.getByText("Copied. Paste it into your CV or job application.").waitFor();
  pace("show");
  await page.waitForTimeout(MODE === "video" ? 1500 : 0);
}

/** The home page first: the promise, How it works, then the way into the demo. */
async function home(page: Page): Promise<void> {
  await page.goto(`${BASE}/`);
  await loaded(page.locator("main h1"));
  await caption(page, "The home page: paid one-day tryouts near you");
  pace("show");
  await page.waitForTimeout(2000);
  await page.evaluate(() => document.getElementById("how-it-works")?.scrollIntoView({ behavior: "smooth" }));
  await page.waitForTimeout(3500);
  await caption(page, "Judges explore with a demo account");
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: "smooth" }));
  await page.waitForTimeout(1500);
  await page.locator('main a[href="/sign-in#demo"]').first().click();
  await loaded(page.getByRole("button", { name: /Sipho, a business owner/ }));
}

/** Encodes the last run's frames (timeline.json in WALK_OUT): after a video run, or alone with the encode argument. */
function writeVideo(): void {
  const out = join(OUT, VIDEO_NAME);
  const { seconds, keep } = encode(loadTimeline(join(OUT, "timeline.json")), MAX_SECONDS, out, process.env.FFMPEG ?? "ffmpeg");
  console.log(`video: ${out}, ${seconds.toFixed(1)} s at normal speed, each wait cut after ${keep} s`);
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
  if (MODE === "video") await context.addInitScript({ content: CAPTION_SCRIPT });
  const page = await context.newPage();
  page.setDefaultTimeout(45_000);
  let screencast: Awaited<ReturnType<typeof startScreencast>> | null = null;
  try {
    if (MODE === "video") {
      await page.route(`${BASE}/walkthrough-title`, (route) => route.fulfill({ contentType: "text/html", body: TITLE_CARD }));
      await page.goto(`${BASE}/walkthrough-title`);
      await page.locator("img").waitFor();
      screencast = await startScreencast(page, join(OUT, "frames"), { width: VIEWPORT.width * 2, height: VIEWPORT.height * 2 });
      pace("show");
      await page.waitForTimeout(TITLE_SECONDS * 1000);
      await home(page);
    } else await page.goto(`${BASE}/sign-in`);
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
      saveTimeline(join(OUT, "timeline.json"), { frames: caught, marks });
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
