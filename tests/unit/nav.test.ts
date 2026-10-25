import { existsSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { NAV } from "@/config/nav";
import { intendedRole, readIntent, withIntent } from "@/domain/intent";
import { ROLES } from "@/domain/roles";

describe("navigation config", () => {
  it("has items for every role", () => {
    expect(Object.keys(NAV).sort()).toEqual([...ROLES].sort());
  });

  it("links only to routes that exist", () => {
    for (const items of Object.values(NAV)) {
      for (const item of items) expect(existsSync(`src/app/(account)${item.href}/page.tsx`), item.href).toBe(true);
    }
  });

  it("puts one badge on each role's bar: offers for a young person, applicants for an owner", () => {
    for (const items of Object.values(NAV)) {
      expect(items.filter((item) => item.badge)).toHaveLength(1);
    }
  });
});

describe("intent from the home page", () => {
  it("reads only the two known intents", () => {
    expect(readIntent("?intent=work")).toBe("work");
    expect(readIntent("?intent=business&x=1")).toBe("business");
    expect(readIntent("?intent=admin")).toBeNull();
    expect(readIntent("")).toBeNull();
  });

  it("carries it to sign-in and the role screen only", () => {
    expect(withIntent("/sign-in", "work")).toBe("/sign-in?intent=work");
    expect(withIntent("/onboarding/role", "business")).toBe("/onboarding/role?intent=business");
    expect(withIntent("/work", "work")).toBe("/work");
    expect(withIntent("/onboarding/role", null)).toBe("/onboarding/role");
  });

  it("maps each intent to the role it hints at", () => {
    expect(intendedRole("work")).toBe("young_person");
    expect(intendedRole("business")).toBe("business");
    expect(intendedRole(null)).toBeNull();
  });
});
