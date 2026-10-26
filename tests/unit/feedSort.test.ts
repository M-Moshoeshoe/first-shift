import { describe, expect, it } from "vitest";
import { sortFeed } from "@/domain/feedSort";

const item = (id: string, km: number | null, payCents: number, startAt: string) => ({ id, km, payCents, startAt });
const ITEMS = [
  item("far-rich-soon", 21, 21000, "2026-10-27T07:00:00.000Z"),
  item("near-poor-late", 3, 14000, "2026-10-29T07:00:00.000Z"),
  item("unknown-mid", null, 16000, "2026-10-28T07:00:00.000Z"),
  item("near-poor-soon", 3, 14000, "2026-10-28T06:00:00.000Z"),
];
const ids = (items: readonly { id: string }[]) => items.map((entry) => entry.id);

describe("sorting the loaded feed", () => {
  it("by Nearest: closest first, unknown distance last, ties to the sooner one", () => {
    expect(ids(sortFeed(ITEMS, "nearest"))).toEqual(["near-poor-soon", "near-poor-late", "far-rich-soon", "unknown-mid"]);
  });

  it("by Highest pay: most first, ties to the sooner one", () => {
    expect(ids(sortFeed(ITEMS, "pay"))).toEqual(["far-rich-soon", "unknown-mid", "near-poor-soon", "near-poor-late"]);
  });

  it("by Soonest: start time", () => {
    expect(ids(sortFeed(ITEMS, "soonest"))).toEqual(["far-rich-soon", "near-poor-soon", "unknown-mid", "near-poor-late"]);
  });

  it("leaves the list it was given as it was", () => {
    const before = ids(ITEMS);
    sortFeed(ITEMS, "pay");
    expect(ids(ITEMS)).toEqual(before);
  });
});
