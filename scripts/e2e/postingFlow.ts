import type { Page, Route } from "playwright-core";
import { findingAndApplying } from "./findingFlow";
import { skeleton } from "./flows";
import { BASE, pathIs, signIn, throttle, type Recorder } from "./kit";
import { addDays, sastDateKey } from "../../src/domain/time";

type Timing = { timing: string; seconds: string };

/** Holds every request to the Firestore emulator until release(), so the list's loading state stays on screen. */
async function holdFirestore(page: Page): Promise<() => Promise<void>> {
  let release: () => void = () => undefined;
  const gate = new Promise<void>((resolve) => (release = resolve));
  const handler = async (route: Route) => {
    await gate;
    await route.continue().catch(() => undefined);
  };
  await page.route("http://127.0.0.1:8080/**", handler);
  return async () => {
    release();
    await page.unroute("http://127.0.0.1:8080/**", handler);
  };
}

/** Answers one API route with a fixed reply, for states the model or the account can't be relied on to produce. */
const answer = (page: Page, path: string, status: number, body: object) =>
  page.route(`**${path}`, (route) => (route.request().method() === "POST" ? route.fulfill({ status, contentType: "application/json", body: JSON.stringify(body) }) : route.continue()));

/** The profile as the server sends it, with no credit left. */
async function withoutCredits(page: Page): Promise<() => Promise<void>> {
  const handler = async (route: Route) => {
    if (route.request().method() !== "GET") return route.continue();
    const response = await route.fetch();
    const view = (await response.json()) as { business?: { credits: { available: number } } };
    if (view.business) view.business.credits.available = 0;
    await route.fulfill({ response, json: view });
  };
  await page.route("**/api/profile", handler);
  return () => page.unroute("**/api/profile", handler);
}

async function describe(page: Page, text: string): Promise<void> {
  await page.getByLabel("What do you need help with?").fill(text);
  await page.getByRole("button", { name: "Draft my tryout" }).click();
}

/**
 * The posting screen and the dashboard, for a business whose profile is
 * complete (business() in flows.ts has just made one). The main path uses
 * the real model: a real draft and a real publish. Review, no credits and a
 * server error are forced through the network, because the model or the
 * account can't be relied on to produce them on cue.
 */
export async function postingAndDashboard(rec: Recorder, page: Page): Promise<Timing[]> {
  const finding = await postingStates(rec, page);
  return [...finding, ...(await businessTimings(page))];
}

/** From the empty dashboard through every posting state, to a real tryout posted with the real model. */
async function postingStates(rec: Recorder, page: Page): Promise<Timing[]> {
  await page.goto(`${BASE}/sign-in`);
  await signIn(page, "e2e-lerato");
  await pathIs(page, "/business");
  await page.getByRole("heading", { name: "No tryouts yet" }).waitFor();
  await rec.check(page, "dashboard, no tryouts yet");
  await skeleton(rec, page, "/business");

  const release = await holdFirestore(page);
  await page.goto(`${BASE}/business`);
  await page.getByRole("status", { name: "Loading your tryouts" }).waitFor();
  await rec.check(page, "dashboard, tryouts loading");
  await release();

  await page.goto(`${BASE}/business`);
  await page.getByRole("link", { name: "Post a tryout" }).click();
  await pathIs(page, "/business/post");
  await page.getByLabel("What do you need help with?").waitFor();
  await rec.check(page, "post, step 1");
  await skeleton(rec, page, "/business/post");
  await page.getByRole("button", { name: "Draft my tryout" }).click();
  await rec.check(page, "post, step 1, empty error");

  await answer(page, "/api/tryouts/draft", 500, { error: "server_error", message: "Something went wrong on our side. Try again in a minute." });
  await describe(page, "Help sorting stock and serving customers on Saturday");
  await page.getByText("Something went wrong on our side").waitFor();
  await rec.check(page, "post, step 1, server error");
  await page.unroute("**/api/tryouts/draft");

  await describe(page, "Fix the wiring in my shop and the plugs at the back");
  await page.getByRole("heading", { name: "This cannot be posted" }).waitFor({ timeout: 90_000 });
  await rec.check(page, "post, blocked");
  await page.getByRole("button", { name: "Edit my request" }).click();

  await describe(page, "Help sorting stock and serving customers on Saturday");
  await page.getByRole("heading", { name: "Check your tryout" }).waitFor({ timeout: 90_000 });
  await rec.check(page, "post, step 2, the draft");
  // A draft can already have the six tasks allowed, which hides Add a task: remove one first.
  if ((await page.getByRole("button", { name: "Add a task" }).count()) === 0) await page.getByRole("button", { name: /^Remove task/ }).last().click();
  await page.getByRole("button", { name: "Add a task" }).click();
  await page.getByLabel("Pay per hour").fill("29.00");
  await page.getByRole("button", { name: "Post tryout" }).click();
  await rec.check(page, "post, step 2, errors");
  await page.locator("textarea[id^=\"post-tasks-\"]").last().fill("Greet customers at the door");
  await page.getByLabel("Pay per hour").fill("35");
  await page.locator("label", { hasText: /^6$/ }).click();
  await page.locator("label", { hasText: "I'll be on site to supervise." }).click();
  await page.getByText("Pay for the day: R210.00").waitFor();
  await rec.check(page, "post, step 2, filled");
  await page.getByRole("button", { name: "Post tryout" }).click();
  await page.getByText("Your tryout is live").waitFor({ timeout: 90_000 });
  await rec.check(page, "post, posted");

  // A young person nearby finds it and applies (findingFlow.ts), then the business is signed back in.
  const timings = await findingAndApplying(rec, page);
  await dashboardStates(rec, page);
  return timings;
}

/** The dashboard with a live tryout, the withdraw sheet, then the forced states: review and no credits left. */
async function dashboardStates(rec: Recorder, page: Page): Promise<void> {
  await pathIs(page, "/business");
  // Thabo applied, withdrew and applied again: one applicant, counted live.
  await page.getByText("Live, 1 applied", { exact: true }).waitFor();
  await rec.check(page, "dashboard, one tryout live, 1 applied");
  await page.getByRole("button", { name: /^Withdraw / }).click();
  await page.getByRole("heading", { name: "Withdraw this tryout?" }).waitFor();
  await page.waitForTimeout(400); // let sheet-enter finish, for the screenshot
  await rec.check(page, "dashboard, withdraw sheet");
  await page.getByRole("button", { name: "Withdraw tryout" }).click();
  await page.getByText("Withdrawn", { exact: true }).waitFor();
  await page.getByRole("heading", { name: "Withdraw this tryout?" }).waitFor({ state: "detached" });
  await rec.check(page, "dashboard, tryout withdrawn");

  await answer(page, "/api/tryouts/draft", 200, { outcome: "allowed", draft: { options: [{ title: "Shop helper", tasks: ["Pack shelves"] }], hours: 5, date: sastDateKey(addDays(new Date(), 1)) } });
  await answer(page, "/api/tryouts", 200, { outcome: "review", id: "forced-review" });
  await page.goto(`${BASE}/business/post`);
  await describe(page, "Help with something at the shop");
  await page.locator("label", { hasText: "I'll be on site to supervise." }).click();
  await page.getByRole("button", { name: "Post tryout" }).click();
  await page.getByRole("heading", { name: "We're checking this one" }).waitFor();
  await rec.check(page, "post, in review");
  await page.unroute("**/api/tryouts/draft");
  await page.unroute("**/api/tryouts");

  const restore = await withoutCredits(page);
  await page.goto(`${BASE}/business/post`);
  await page.getByText("You've used your credits").waitFor();
  await rec.check(page, "post, no credits left");
  await page.goto(`${BASE}/business`);
  await page.getByText("Free tryouts left: 0").waitFor();
  await rec.check(page, "dashboard, no credits left");
  await restore();
}

/** Slow 4G, opening each business page to the moment it's usable. Last, as throttling stays on for this page. */
async function businessTimings(page: Page): Promise<Timing[]> {
  // The dev server's bundles aren't minified, so these are pessimistic.
  await throttle(page);
  const timings: Timing[] = [];
  for (const [path, ready] of [["/business", "Your tryouts"], ["/business/post", "What do you need help with?"]] as const) {
    const start = Date.now();
    await page.goto(`${BASE}${path}`, { waitUntil: "commit" });
    await (path === "/business" ? page.getByText("Withdrawn", { exact: true }) : page.getByLabel(ready)).waitFor({ timeout: 120_000 });
    timings.push({ timing: `${path}: open to ready, Slow 4G (dev server)`, seconds: ((Date.now() - start) / 1000).toFixed(1) });
  }
  return timings;
}
