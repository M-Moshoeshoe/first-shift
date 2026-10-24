import { describe, expect, it } from "vitest";
import { AREAS } from "@/config/areas";
import { canonicaliseArea } from "@/domain/areas";

describe("canonicaliseArea", () => {
  it.each([
    ["Ivory Park", "Ivory Park"],
    ["ivory park", "Ivory Park"],
    ["ivory prk", "Ivory Park"],
    ["IvoryPark", "Ivory Park"],
    ["  Ivory   Park  ", "Ivory Park"],
    ["Ivory Park Ext 2", "Ivory Park"],
    ["ivory park extension 12", "Ivory Park"],
    ["Ivory Park x2", "Ivory Park"],
    ["Ivory Park, Ext. 7", "Ivory Park"],
    ["thembisa", "Tembisa"],
    ["Tembisa ext 25", "Tembisa"],
    ["alex", "Alexandra"],
    ["MIDRAND", "Midrand"],
  ])("maps %j to %j", (typed, official) => {
    expect(canonicaliseArea(typed)).toBe(official);
  });

  it("keeps an unknown area exactly as typed", () => {
    expect(canonicaliseArea("Mamelodi East")).toBe("Mamelodi East");
    expect(canonicaliseArea("orange farm ext 3")).toBe("orange farm ext 3");
  });

  it("doesn't match an area that only starts like a known one", () => {
    expect(canonicaliseArea("Ivory Park North Clinic")).toBe("Ivory Park North Clinic");
    expect(canonicaliseArea("Midrand Ext")).toBe("Midrand Ext");
  });

  it("maps every official name and alias in the config", () => {
    for (const { name, aliases } of AREAS) {
      expect(canonicaliseArea(name)).toBe(name);
      for (const alias of aliases) expect(canonicaliseArea(alias)).toBe(name);
    }
  });

  it("never lets two areas claim the same spelling", () => {
    const owners = new Map<string, Set<string>>();
    for (const { name, aliases } of AREAS) {
      for (const spelling of [name, ...aliases]) {
        const key = spelling.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
        owners.set(key, (owners.get(key) ?? new Set()).add(name));
      }
    }
    expect([...owners].filter(([, names]) => names.size > 1)).toEqual([]);
  });
});
