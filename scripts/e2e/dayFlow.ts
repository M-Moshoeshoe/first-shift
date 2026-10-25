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
  await page.getByRole("button", { name: "Paid", exact: true }).click();
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
}
