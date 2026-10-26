import { getFirestore } from "firebase-admin/firestore";
import type { Page } from "playwright-core";
import { checkTerms, newTryout } from "../../src/domain/tryoutDecisions";
import { addDays, sastDateKey } from "../../src/domain/time";
import { z } from "zod";
import { BASE, pathIs, signIn, unthrottle, type Recorder } from "./kit";
import { adminApp } from "./session";

export const BOOKING_TITLE = "Till and shelf helper";

// The fields a tryout copies from its business (tryoutDecisions.ts, newTryout).
const BusinessSchema = z.object({
  ownerId: z.string(),
  status: z.enum(["active", "paused", "suspended"]),
  completed: z.number(),
  onTime: z.number(),
  lateCancellations: z.number(),
  noShows: z.number(),
  name: z.string(),
  area: z.string(),
  location: z.object({ latitude: z.number(), longitude: z.number(), accuracyMetres: z.number() }),
  shopfrontPhoto: z.object({ path: z.string(), version: z.string() }),
});

/**
 * A second tryout for Lerato, written straight into the emulator: posting has
 * already been walked through the real model, and this keeps the walk short.
 * Tomorrow, 09:00 to 15:00, through the same rules as posting.
 */
async function seedTryout(): Promise<string> {
  const db = getFirestore(adminApp());
  const found = await db.collection("businesses").where("name", "==", "Lerato's Spaza").limit(1).get();
  const doc = found.docs[0];
  if (!doc) throw new Error("Lerato's business should exist by now (flows.ts, business)");
  const business = BusinessSchema.parse(doc.data());
  const now = new Date();
  const terms = { description: "Help at the till and on the shelves", title: BOOKING_TITLE, tasks: ["Pack shelves", "Help at the till with a supervisor"], date: sastDateKey(addDays(now, 1)), startTime: "09:00", hours: 6, rateCentsPerHour: 3500 };
  const decided = checkTerms(now, terms);
  const record = decided.ok ? newTryout({ uid: doc.id, demo: false }, business, terms, decided.value, "published", "stock_and_packing") : null;
  if (!record) throw new Error("the seeded tryout breaks a rule");
  const ref = await db.collection("tryouts").add({ ...record, createdAt: now, updatedAt: now });
  return ref.id;
}

async function switchTo(page: Page, account: string, home: string): Promise<void> {
  await page.getByRole("button", { name: "Sign out" }).first().click();
  await pathIs(page, "/sign-in");
  await signIn(page, account);
  await pathIs(page, home);
}

/**
 * Phase 4, walked by both people: Thabo applies, Lerato sees the badge and
 * the ranked applicant and offers it, Thabo sees his badge and accepts, and
 * both open the booking. Returns the booking's address for the day (Phase 5).
 */
export async function bookingWalk(rec: Recorder, page: Page): Promise<string> {
  await unthrottle(page);
  const tryoutId = await seedTryout();
  await switchTo(page, "e2e-thabo", "/work");
  await page.goto(`${BASE}/work/tryouts/${tryoutId}`);
  await page.getByRole("button", { name: "Apply" }).click();
  await page.getByRole("heading", { name: "You've applied" }).waitFor();

  await switchTo(page, "e2e-lerato", "/business");
  await page.getByText("(1 new)").filter({ visible: true }).first().waitFor();
  await rec.check(page, "dashboard, new applicant badge");
  await page.goto(`${BASE}/business/tryouts/${tryoutId}`);
  await page.getByRole("heading", { name: "Who applied" }).waitFor();
  // The shortlist shows what Thabo said he can do (stock and packing, this tryout's kind of work) and his languages, never his surname.
  await page.getByText("Says they can do this kind of work", { exact: true }).waitFor();
  await page.getByText("Serving customers, Stock and packing").waitFor();
  await page.getByText("English, isiZulu").waitFor();
  if ((await page.getByText("Mokoena").count()) > 0) rec.failures.push(`${rec.width} px: the owner can see the young person's surname`);
  await rec.check(page, "owner's tryout, applicants ranked");
  await page.getByRole("button", { name: "Offer the tryout to Thabo" }).click();
  await page.getByText("Offered to Thabo.").waitFor();
  await rec.check(page, "owner's tryout, offer waiting");

  await switchTo(page, "e2e-thabo", "/work");
  await page.getByText("(1 new)").filter({ visible: true }).first().waitFor();
  await page.goto(`${BASE}/work/applications`);
  await page.getByText("Offered to you").waitFor();
  await rec.check(page, "applications, an offer waiting");
  await page.goto(`${BASE}/work/tryouts/${tryoutId}`);
  await page.getByRole("heading", { name: "You've been offered this tryout" }).waitFor();
  await rec.check(page, "tryout detail, offered");
  await page.getByRole("button", { name: "Accept" }).click();
  await page.getByRole("heading", { name: "You're booked" }).waitFor();
  await page.getByRole("link", { name: "See your booking" }).click();
  await page.waitForURL((url) => url.pathname.startsWith("/bookings/"));
  const bookingPath = new URL(page.url()).pathname;
  await page.getByRole("heading", { name: "Your check-in code" }).waitFor();
  // Once booked, the young person sees who they'll meet and can message them; never the owner's surname.
  await page.getByRole("heading", { name: "Lerato, the owner" }).waitFor();
  if ((await page.getByRole("link", { name: "Chat on WhatsApp" }).getAttribute("href")) !== "https://wa.me/27831234567") rec.failures.push(`${rec.width} px: the young person can't message the owner`);
  if ((await page.getByText("Mahlangu").count()) > 0) rec.failures.push(`${rec.width} px: the young person can see the owner's surname`);
  await rec.check(page, "booking, young person");

  const share = await page.getByRole("link", { name: "Share my trip" }).getAttribute("href");
  const statusLink = decodeURIComponent(share ?? "").match(/https?:\/\/\S+\/status\/[A-Za-z0-9_-]+/)?.[0];
  if (!share?.startsWith("https://wa.me/?text=") || !statusLink) rec.failures.push(`${rec.width} px: Share my trip has no status link: ${share}`);
  await page.getByRole("button", { name: "Report a problem" }).click();
  await page.getByRole("group", { name: "What happened?" }).waitFor();
  await rec.check(page, "booking, report a problem");
  await page.getByRole("button", { name: "Send report" }).click();
  await page.getByText("Choose what happened.").first().waitFor();
  await page.getByRole("button", { name: "Cancel this tryout" }).click();
  await page.getByText("Cancelling now is free.").waitFor();
  await rec.check(page, "booking, cancel asks first");
  await page.getByRole("button", { name: "Keep the booking" }).click();

  if (statusLink) {
    await page.goto(statusLink.replace(/^https?:\/\/[^/]+/, BASE));
    await page.getByText("Thabo's tryout").waitFor();
    await rec.check(page, "status page for a trusted contact");
  }
  await page.goto(`${BASE}/status/not-a-real-token-at-all`);
  await page.getByText("This link is not working.", { exact: false }).waitFor();

  await page.goto(`${BASE}/work`);
  await switchTo(page, "e2e-lerato", "/business");
  await page.goto(`${BASE}${bookingPath}`);
  await page.getByText("Their number for payments", { exact: false }).waitFor();
  if ((await page.getByText("Your check-in code").count()) > 0) rec.failures.push(`${rec.width} px: the owner can see the check-in code`);
  await rec.check(page, "booking, business");
  return bookingPath;
}
