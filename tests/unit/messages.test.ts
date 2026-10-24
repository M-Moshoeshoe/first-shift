import { describe, expect, it } from "vitest";
import { BUTTON_LABELS, FIELD_MESSAGES, ID_HINT, ID_PROBLEM_MESSAGES, PROFILE_MESSAGES, signInErrorMessage, splitContactLink } from "@/domain/messages";
import { PHOTO_KINDS } from "@/domain/profile";

const SIGN_IN_CODES = ["auth/popup-blocked", "auth/popup-closed-by-user", "auth/network-request-failed", "auth/too-many-requests", "auth/x"];

const everyMessage = [
  ID_HINT,
  ...Object.values(ID_PROBLEM_MESSAGES),
  ...Object.values(FIELD_MESSAGES),
  ...Object.values(PROFILE_MESSAGES.roleLocked),
  ...PHOTO_KINDS.map((kind) => PROFILE_MESSAGES.photoMissing(kind)),
  ...Object.values(PROFILE_MESSAGES).flatMap((value) => (typeof value === "string" ? [value] : [])),
  ...SIGN_IN_CODES.map(signInErrorMessage),
];

describe("error copy follows the copy rules", () => {
  it.each(everyMessage)("%s", (message) => {
    expect(message).not.toMatch(/—|sorry|apolog|unfortunately|oops|!/i);
    expect(message).toMatch(/\.$/);
  });

  it("names buttons only by their exact labels", () => {
    const labels: string[] = Object.values(BUTTON_LABELS);
    for (const message of everyMessage) {
      // "tap X or Y": both X and Y must be real labels.
      for (const match of message.matchAll(/\btap (.+?)(?= again| to try| while| and|\.|,)/gi)) {
        for (const label of (match[1] ?? "").split(" or ")) expect(labels).toContain(label);
      }
    }
  });

  it("points each photo form at its own save button", () => {
    expect(PROFILE_MESSAGES.photoMissing("profile")).toContain(`tap ${BUTTON_LABELS.saveMyProfile}.`);
    expect(PROFILE_MESSAGES.photoMissing("shopfront")).toContain(`tap ${BUTTON_LABELS.saveMyBusiness}.`);
  });
});

describe("contact us links", () => {
  it("finds the phrase in the ID messages, whatever its case", () => {
    expect(splitContactLink(PROFILE_MESSAGES.idLocked)).toEqual({
      before: "Your account already has a different ID number. If you entered the wrong ID number, ",
      phrase: "contact us",
      after: " to correct it.",
    });
    expect(splitContactLink("Contact us any time.")?.phrase).toBe("Contact us");
    expect(splitContactLink(PROFILE_MESSAGES.fallback)).toBeNull();
  });
});
