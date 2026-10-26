import { describe, expect, it } from "vitest";
import { cleanIntro, LANGUAGES, skillFit } from "@/domain/workerProfile";
import { LANGUAGE_LABELS, SKILL_LABELS } from "@/domain/profileCopy";
import { ALLOWED_CATEGORIES } from "@/domain/allowedWork";

describe("the one-line introduction", () => {
  it("takes out phone numbers however they're written", () => {
    for (const text of ["Call 082 123 4567 anytime", "Call +27 82 123 4567 anytime", "Call 0821234567 anytime", "Call (082) 123-4567 anytime", "Call 082.123.4567 anytime"]) {
      expect(cleanIntro(text), text).toBe("Call anytime");
    }
  });

  it("takes out email addresses, links, websites and social handles", () => {
    expect(cleanIntro("Email thabo.m@gmail.com for my CV")).toBe("Email for my CV");
    expect(cleanIntro("See https://example.com/me and www.thabo.co.za")).toBe("See and");
    expect(cleanIntro("My page is thabo.co.za, check it")).toBe("My page is, check it");
    expect(cleanIntro("Find me @thabo_m on TikTok")).toBe("Find me on TikTok");
  });

  it("keeps ordinary numbers, and tidies and caps the line at 120 characters", () => {
    expect(cleanIntro("  I worked 2 years at a R50 a day stall, 8 hours a day  ")).toBe("I worked 2 years at a R50 a day stall, 8 hours a day");
    expect(cleanIntro("x".repeat(200))).toHaveLength(120);
    expect(cleanIntro("")).toBe("");
  });
});

describe("what I can do", () => {
  it("is the same list of work a tryout can be, each with a name", () => {
    expect(Object.keys(SKILL_LABELS).sort()).toEqual([...ALLOWED_CATEGORIES].sort());
  });

  it("offers the 11 official languages and South African Sign Language", () => {
    expect(LANGUAGES).toHaveLength(12);
    expect(LANGUAGE_LABELS.sasl).toBe("South African Sign Language");
    expect(Object.values(LANGUAGE_LABELS)).toEqual(expect.arrayContaining(["English", "Afrikaans", "isiZulu", "isiXhosa", "isiNdebele", "Sepedi", "Sesotho", "Setswana", "siSwati", "Tshivenda", "Xitsonga"]));
  });

  it("fits a tryout fully when its kind of work is one they can do, less when it isn't, and neutrally when they haven't said", () => {
    expect(skillFit(["cleaning", "car_washing"], "car_washing")).toBe(1);
    expect(skillFit(["cleaning"], "customer_service")).toBe(0.25);
    expect(skillFit(undefined, "customer_service")).toBe(0.5);
    expect(skillFit(["cleaning"], null)).toBe(0.5);
  });
});
