import type { Page } from "playwright-core";
import { BASE, pathIs, signIn, type Recorder } from "./kit";
import { startNow } from "./session";

async function switchTo(page: Page, account: string, home: string): Promise<void> {
  await page.getByRole("button", { name: "Sign out" }).first().click();
  await pathIs(page, "/sign-in");
  await signIn(page, account);
  await pathIs(page, home);
}

/** Phase 5, walked by both people: the door, check-out, Paid, and Received. The owner is signed in on the booking page. */
export async function dayWalk(rec: Recorder, page: Page, bookingPath: string): Promise<void> {
  const code = await startNow(bookingPath.split("/").pop() ?? "");
  await page.goto(`${BASE}${bookingPath}`);
  await page.getByRole("heading", { name: "At the door" }).waitFor();
  await page.getByRole("button", { name: "Check in Thabo" }).click();
  await page.getByText("Check all three at the door", { exact: false }).waitFor();
  await rec.check(page, "the door, checks not ticked");
  for (const label of ["Their face matches the photo", "The name on their ID card is Thabo", "The last four digits of their ID number are"]) {
    await page.locator("label", { hasText: label }).click();
  }
  await page.getByLabel("Their check-in code").fill(code);
  await page.getByRole("button", { name: "Check in Thabo" }).click();
  await page.getByText("Checked in at", { exact: false }).waitFor();
  await page.getByRole("heading", { name: "Check out" }).waitFor();
  await rec.check(page, "checked in, check-out ready");
  await page.locator("label", { hasText: "We finished the work" }).click();
  // The three answers are required: Check out without them says so and moves to the first.
  await page.getByRole("button", { name: "Check out" }).click();
  await page.getByText("Answer the three questions about the day.").waitFor();
  await rec.check(page, "check-out, the three answers missing");
  for (const id of ["check-out-onTime-yes", "check-out-didTheWork-yes", "check-out-wouldHireAgain-yes"]) await page.locator(`label[for="${id}"]`).click();
  await page.getByRole("button", { name: "Check out" }).click();
  await page.getByText("You owe Thabo R210.00.").waitFor();
  // Only the ways Thabo chose (Profile: FNB eWallet, PayShap and cash), never cash-send.
  const methods = await page.getByRole("group", { name: "How did you pay?" }).locator("label").allInnerTexts();
  if (methods.join(", ") !== "FNB eWallet, PayShap, Cash") rec.failures.push(`${rec.width} px: the owner was offered ${methods.join(", ")}`);
  await page.locator('label[for="pay-method-cash"]').click();
  await page.getByText("Hand over the cash, then ask Thabo to tap Received on their phone.").waitFor();
  await rec.check(page, "checked out, pay in cash");
  await page.locator('label[for="pay-method-ewallet"]').click();
  await page.getByLabel("Payment reference").fill("FS THABO 27");
  await rec.check(page, "checked out, pay by eWallet with a reference");
  await page.getByRole("button", { name: "Mark as paid", exact: true }).click();
  await page.getByText("Waiting for Thabo to confirm", { exact: false }).waitFor();
  await rec.check(page, "paid, waiting for Thabo");

  await page.goto(`${BASE}/business`);
  await switchTo(page, "e2e-thabo", "/work");
  await page.goto(`${BASE}${bookingPath}`);
  await page.getByText("says they paid you R210.00 by FNB eWallet", { exact: false }).waitFor();
  await page.getByText("Payment reference: FS THABO 27").waitFor();
  // The codes exactly as they're dialled, asterisks and all, each a link that dials.
  for (const code of ["*120*277#", "*130*277#"]) {
    const link = page.getByRole("link", { name: code, exact: true });
    if ((await link.count()) !== 1 || (await link.getAttribute("href")) !== `tel:${encodeURIComponent(code)}`) rec.failures.push(`${rec.width} px: the balance code ${code} isn't on the page as a link that dials`);
  }
  await rec.check(page, "young person, check your balance");
  await page.getByRole("button", { name: "Received", exact: true }).click();
  await page.getByText("Received. Your reference comes next.").waitFor();
  await rec.check(page, "young person, received");
  await referenceAndRecord(rec, page);
}

/** Phase 6: the reference written from Lerato's answers (the real model), added to the record, and the record shared. */
async function referenceAndRecord(rec: Recorder, page: Page): Promise<void> {
  await page.getByText("Written with AI from the business's answers").waitFor({ timeout: 90_000 });
  for (const question of ["On time?", "Did the work as asked?", "Would you hire them again?"]) await page.getByText(question, { exact: true }).waitFor();
  await rec.check(page, "young person, the reference to review");
  await page.getByRole("button", { name: "Add to my record" }).click();
  await page.getByText("Added to your record.").waitFor();
  await page.goto(`${BASE}/work/record`);
  await page.getByRole("heading", { name: "Your work record" }).waitFor();
  await page.getByText("Paid, confirmed by both").first().waitFor();
  await rec.check(page, "work record");
  const link = (await page.locator("p.break-all").innerText()).trim();
  if (!/\/record\/[A-Za-z0-9_-]{24}$/.test(link)) rec.failures.push(`${rec.width} px: the share link looks wrong: ${link}`);
  await page.goto(link.replace(/^https?:\/\/[^/]+/, BASE));
  await page.getByRole("heading", { name: "Thabo's verified work record" }).waitFor();
  await page.getByText("Written with AI from the business's answers").waitFor();
  if ((await page.getByText(/Mokoena|082 123 4567|27821234567|0087/).count()) > 0) rec.failures.push(`${rec.width} px: the shared record shows private details`);
  await rec.check(page, "shared work record, no sign-in");
  await page.goto(`${BASE}/record/not-a-real-token-at-all`);
  await page.getByText("This link is not working.", { exact: false }).waitFor();
  await page.goto(`${BASE}/work`);
}
