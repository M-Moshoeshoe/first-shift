import { describe, expect, it } from "vitest";
import { cvText, referenceSummary, type CvEntry } from "@/domain/cvText";

const LINK = "https://firstshiftza.netlify.app/record/abc123";

const phoneShop: CvEntry = {
  businessName: "Sipho's Phone Repairs",
  businessArea: "Randburg",
  day: "Saturday 24 October",
  year: 2026,
  hours: 6,
  reference: { text: "Thabo arrived on time and greeted every customer. He packed the shelves neatly. We would hire him again." },
};
const spaza: CvEntry = { businessName: "Lerato's Spaza", businessArea: "Tembisa", day: "Saturday 10 October", year: 2026, hours: 4.5, reference: null };

describe("referenceSummary", () => {
  it("keeps the first sentence, on one line", () => {
    expect(referenceSummary("Thabo arrived on time.\n  He packed the shelves.")).toBe("Thabo arrived on time.");
    expect(referenceSummary("Worked hard all day")).toBe("Worked hard all day");
    expect(referenceSummary("Sold R1.50 sweets? Yes! All day.")).toBe("Sold R1.50 sweets?");
  });
});

describe("cvText", () => {
  it("writes one block per tryout in the record's order, with the reference's first sentence and the link", () => {
    expect(cvText([phoneShop, spaza], [], LINK)).toBe(
      [
        "Work experience (verified on First Shift)",
        "Paid tryout, Sipho's Phone Repairs, Randburg, Saturday 24 October 2026 (6 hours)\nThabo arrived on time and greeted every customer.",
        "Paid tryout, Lerato's Spaza, Tembisa, Saturday 10 October 2026 (4.5 hours)",
        `Check these at: ${LINK}`,
      ].join("\n\n"),
    );
  });

  it("leaves the reference line out when there is no approved reference", () => {
    const text = cvText([{ ...phoneShop, reference: null }], [], LINK);
    expect(text).toContain("Paid tryout, Sipho's Phone Repairs, Randburg, Saturday 24 October 2026 (6 hours)\n\nCheck these at:");
    expect(text).not.toContain("arrived");
  });

  it("says Hired by once, on the newest tryout with that business, and never for an offer that was not a hire", () => {
    const earlier: CvEntry = { ...phoneShop, day: "Saturday 17 October", reference: null };
    const text = cvText([phoneShop, earlier, spaza], [{ businessName: "Sipho's Phone Repairs", hired: true }, { businessName: "Lerato's Spaza", hired: false }], LINK);
    expect(text.match(/Hired by/g)).toHaveLength(1);
    expect(text).toContain("Thabo arrived on time and greeted every customer.\nHired by Sipho's Phone Repairs\n\nPaid tryout, Sipho's Phone Repairs, Randburg, Saturday 17 October 2026");
    expect(text).not.toContain("Hired by Lerato's Spaza");
  });

  it("still gives the heading and the link for an empty record", () => {
    expect(cvText([], [], LINK)).toBe(`Work experience (verified on First Shift)\n\nCheck these at: ${LINK}`);
  });
});
