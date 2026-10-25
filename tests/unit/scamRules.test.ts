import { describe, expect, it } from "vitest";
import { reportCategoriesFor, pausesBusinessAtOnce } from "@/domain/cases";
import { asksForMoney } from "@/domain/scamRules";

describe("young people never pay anyone to get a tryout", () => {
  it("catches a fee, a deposit or the young person told to pay", () => {
    for (const text of [
      "Shop helper. Registration fee of R50 on the day",
      "Bring a R100 deposit for the uniform",
      "Applicants must pay R80 for training first",
      "You will need to buy your own uniform",
      "Car wash helper: send us R30 to secure your spot",
      "eWallet me R50 admin fee before you start",
      "There is a small joining fee",
      "Candidates should first transfer the starter pack money",
    ]) {
      expect(asksForMoney(text), text).toBe(true);
    }
  });

  it("leaves ordinary work alone, including handling the shop's money", () => {
    for (const text of [
      "Help sorting stock and serving customers on Saturday",
      "Serve customers at the till and give the right change",
      "Count the cash float with the owner at the end of the day",
      "We pay R35 an hour, paid by eWallet at the end of the day",
      "Pack bread and cool drinks onto the shelves",
      "Help customers pay at the counter",
    ]) {
      expect(asksForMoney(text), text).toBe(false);
    }
  });
});

describe("reports that keep money safe", () => {
  it("lets a young person say they were asked for money, which pauses the business at once", () => {
    expect(reportCategoriesFor("young_person")).toContain("asked_for_money");
    expect(pausesBusinessAtOnce("asked_for_money")).toBe(true);
  });

  it("settles an overpayment only by review: the business reports it, and nothing asks for money back", () => {
    expect(reportCategoriesFor("business")).toContain("paid_too_much");
    expect(reportCategoriesFor("young_person")).not.toContain("paid_too_much");
    expect(reportCategoriesFor("business")).not.toContain("asked_for_money");
    expect(pausesBusinessAtOnce("paid_too_much")).toBe(false);
  });
});
