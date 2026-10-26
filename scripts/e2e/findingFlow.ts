import type { Page, Route } from "playwright-core";
import { BASE, pathIs, SLOW_4G, signIn, type Recorder } from "./kit";

type Timing = { timing: string; seconds: string };

/** Answers one GET route with a fixed reply, for states the data can't be relied on to produce on cue. */
async function answerGet(page: Page, pattern: string, status: number, body: object): Promise<() => Promise<void>> {
  const handler = (route: Route) => (route.request().method() === "GET" ? route.fulfill({ status, contentType: "application/json", body: JSON.stringify(body) }) : route.continue());
  await page.route(pattern, handler);
  return () => page.unroute(pattern, handler);
}

async function switchTo(page: Page, account: string, home: string): Promise<void> {
  await page.getByRole("button", { name: "Sign out" }).first().click();
  await pathIs(page, "/sign-in");
  await signIn(page, account);
  await pathIs(page, home);
}

/**
 * A young person finds the tryout the business has just posted (postingFlow.ts),
 * opens it, applies with a note, withdraws, and applies again; then the
 * business is signed back in. The empty, unknown-area, failed, closed and
 * overlapping states are forced through the network.
 */
export async function findingAndApplying(rec: Recorder, page: Page): Promise<Timing[]> {
  await switchTo(page, "e2e-thabo", "/work");
  await page.getByRole("heading", { name: "What's a tryout?" }).waitFor();
  await page.getByText("Lerato's Spaza").first().waitFor();
  await rec.check(page, "feed, first visit, with the explainer");
  await page.getByRole("button", { name: "Got it" }).click();
  await page.reload();
  await page.getByText("Lerato's Spaza").first().waitFor();
  if ((await page.getByRole("heading", { name: "What's a tryout?" }).count()) > 0) rec.failures.push(`${rec.width} px: the explainer came back after Got it`);
  await rec.check(page, "feed, explainer dismissed");
  await page.getByRole("button", { name: "Refresh" }).click();
  await page.getByRole("button", { name: "Refresh" }).waitFor();

  await page.locator('a[href^="/work/tryouts/"]', { hasText: "Lerato's Spaza" }).first().click();
  await page.waitForURL((url) => url.pathname.startsWith("/work/tryouts/"));
  const detailPath = new URL(page.url()).pathname;
  await page.getByRole("button", { name: "Apply" }).waitFor();
  await rec.check(page, "tryout detail");
  await page.getByLabel("A note for the business (optional)").fill("I can be there by 8:30.");
  await page.getByRole("button", { name: "Apply" }).click();
  await page.getByRole("heading", { name: "You've applied" }).waitFor();
  await rec.check(page, "tryout detail, applied");
  await page.reload();
  await page.getByRole("heading", { name: "You've applied" }).waitFor();
  await page.getByRole("button", { name: "Withdraw my application" }).click();
  await page.getByText("Your application is withdrawn.").waitFor();
  await rec.check(page, "tryout detail, withdrawn");
  await page.getByRole("button", { name: "Apply" }).click();
  await page.getByRole("heading", { name: "You've applied" }).waitFor();

  await forcedStates(rec, page, detailPath);
  const timings = await workTimings(page, detailPath);
  await switchTo(page, "e2e-lerato", "/business");
  return timings;
}

/** Slow 4G, opening the feed and a tryout to the moment each is usable; then the network goes back to normal. */
async function workTimings(page: Page, detailPath: string): Promise<Timing[]> {
  const cdp = await page.context().newCDPSession(page);
  await cdp.send("Network.enable");
  await cdp.send("Network.emulateNetworkConditions", SLOW_4G);
  const timings: Timing[] = [];
  // The dev server's bundles aren't minified, so these are pessimistic.
  for (const [path, ready] of [["/work", page.locator('a[href^="/work/tryouts/"]').first()], [detailPath, page.getByRole("heading", { name: "You've applied" })]] as const) {
    const start = Date.now();
    await page.goto(`${BASE}${path}`, { waitUntil: "commit" });
    await ready.waitFor({ timeout: 120_000 });
    timings.push({ timing: `${path.startsWith("/work/tryouts/") ? "/work/tryouts/[id]" : path}: open to ready, Slow 4G (dev server)`, seconds: ((Date.now() - start) / 1000).toFixed(1) });
  }
  await cdp.send("Network.emulateNetworkConditions", { offline: false, latency: 0, downloadThroughput: -1, uploadThroughput: -1 });
  return timings;
}

async function forcedStates(rec: Recorder, page: Page, detailPath: string): Promise<void> {
  // The real tryout is still open, so these states are forced; the real one comes back afterwards.
  await page.goto(`${BASE}/work/tryouts/no-such-tryout`);
  await page.getByRole("heading", { name: "Tryout not available" }).waitFor();
  await rec.check(page, "tryout detail, not found");

  for (const [name, state, text] of [
    ["closed", { kind: "closed", reason: "booking_closed" }, "Applications for this tryout have closed."],
    ["overlapping a booking", { kind: "not_eligible", reason: "overlaps_booking" }, "You're booked on another tryout at this time"],
  ] as const) {
    const restore = await answerGet(page, "**/api/tryouts/forced", 200, {
      item: { id: "forced", title: "Shop helper", businessName: "Lerato's Spaza", area: "Tembisa", startAt: "2026-10-27T07:00:00.000Z", endAt: "2026-10-27T13:00:00.000Z", hours: 6, rateCentsPerHour: 3500, payCents: 21000, returnFareCents: null, distance: "about 3 km", km: 3, injuryCover: "Injury cover: not confirmed", payRecord: "New on First Shift" },
      tasks: ["Pack shelves"],
      state,
    });
    await page.goto(`${BASE}/work/tryouts/forced`);
    await page.getByText(text, { exact: false }).waitFor();
    await rec.check(page, `tryout detail, ${name}`);
    await restore();
  }

  for (const [name, status, body, text] of [
    ["empty", 200, { status: "ok", area: "Ivory Park", items: [] }, "No tryouts near you right now"],
    ["unknown area", 200, { status: "unknown_area", area: "Soshanguve" }, "We do not know where Soshanguve is yet"],
    ["failed", 500, { error: "server_error", message: "Something went wrong on our side. Try again in a minute." }, "Something went wrong on our side"],
  ] as const) {
    const restore = await answerGet(page, "**/api/tryouts/nearby", status, body);
    await page.goto(`${BASE}/work`);
    await page.getByText(text, { exact: false }).first().waitFor();
    await rec.check(page, `feed, ${name}`);
    await restore();
  }
  await page.goto(`${BASE}${detailPath}`);
  await page.getByRole("heading", { name: "You've applied" }).waitFor();
}
