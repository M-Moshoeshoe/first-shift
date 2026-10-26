import { describe, expect, it } from "vitest";
import { cookieValueFor, homeFromCookies } from "@/domain/signedInHint";

describe("the signed-in hint for public pages", () => {
  it("names the home to open, from among other cookies", () => {
    expect(homeFromCookies("a=1; fs_signed_in=work; b=2")).toBe("/work");
    expect(homeFromCookies("fs_signed_in=business")).toBe("/business");
  });

  it("is ignored when missing, empty or anything we did not write", () => {
    expect(homeFromCookies("")).toBeNull();
    expect(homeFromCookies("fs_signed_in=")).toBeNull();
    expect(homeFromCookies("fs_signed_in=/admin")).toBeNull();
    expect(homeFromCookies("not_fs_signed_in=work")).toBeNull();
  });

  it("round-trips each home", () => {
    expect(homeFromCookies(`fs_signed_in=${cookieValueFor("/work")}`)).toBe("/work");
    expect(homeFromCookies(`fs_signed_in=${cookieValueFor("/business")}`)).toBe("/business");
  });
});
