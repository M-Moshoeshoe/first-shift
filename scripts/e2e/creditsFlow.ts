import type { Page } from "playwright-core";
import { BOOKING_TITLE } from "./bookingFlow";
import { BASE, pathIs, signIn, type Recorder } from "./kit";

/** The Credits screen, as the owner sees it after the day: the free credits, the one used, a request for more, and the launch prices as text. */
export async function creditsWalk(rec: Recorder, page: Page, bookingPath: string): Promise<void> {
  await page.getByRole("button", { name: "Sign out" }).first().click();
  await pathIs(page, "/sign-in");
  await signIn(page, "e2e-lerato");
  await pathIs(page, "/business");
  // The owner's own answers on the booking, read-only: nobody rewrites a reference.
  await page.goto(bookingPath.startsWith("/") ? `${BASE}${bookingPath}` : bookingPath);
  await page.getByRole("heading", { name: "Your answers" }).waitFor();
  await rec.check(page, "booking, the owner's answers after Received");
  await page.goto(`${BASE}/business`);
  await page.getByRole("link", { name: "See your credits" }).click();
  await pathIs(page, "/business/credits");
  await page.getByRole("heading", { name: "Credits", exact: true }).waitFor();
  for (const line of ["3 credits added, free", `1 credit used: ${BOOKING_TITLE}`, `1 credit held for ${BOOKING_TITLE}`, "At launch: 5 tryouts for R125 or 10 for R250, by card or Instant EFT."]) {
    await page.getByText(line, { exact: true }).first().waitFor();
  }
  await rec.check(page, "credits, before a request");
  await page.getByRole("button", { name: "Request more credits" }).click();
  await page.getByText("We'll add them and let you know.", { exact: false }).waitFor();
  if ((await page.getByRole("button", { name: "Request more credits" }).count()) > 0) rec.failures.push(`${rec.width} px: the request button stays after asking`);
  await page.reload();
  await page.getByText("You asked for more credits").waitFor();
  await rec.check(page, "credits, requested");
  await page.goto(`${BASE}/business`);
}
