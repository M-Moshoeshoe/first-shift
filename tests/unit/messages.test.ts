import { describe, expect, it } from "vitest";
import { BUTTON_LABELS } from "@/domain/buttonLabels";
import { FIELD_MESSAGES, ID_HINT, ID_PROBLEM_MESSAGES, LOCATION_MESSAGES, PROFILE_MESSAGES, UPLOAD_COPY, pinPrecisionText, signInErrorMessage, demoSignInErrorMessage, splitContactLink, DEMO_MESSAGES } from "@/domain/messages";
import { PHOTO_KINDS } from "@/domain/profile";
import { BOOKING_MESSAGES, POSTING_PROBLEM_MESSAGES, TERMS_MESSAGES, TRYOUT_FIELD_MESSAGES, TRYOUT_MESSAGES } from "@/domain/tryoutMessages";

const DEMO_CODES = ["auth/invalid-custom-token", "auth/user-disabled", "auth/too-many-requests", "auth/network-request-failed", "auth/x"];
const SIGN_IN_CODES = ["auth/popup-blocked", "auth/popup-closed-by-user", "auth/network-request-failed", "auth/too-many-requests", "auth/x"];

const everyMessage = [
  ID_HINT,
  ...Object.values(ID_PROBLEM_MESSAGES),
  ...Object.values(FIELD_MESSAGES),
  ...Object.values(PROFILE_MESSAGES.roleLocked),
  ...PHOTO_KINDS.map((kind) => PROFILE_MESSAGES.photoMissing(kind)),
  ...Object.values(PROFILE_MESSAGES).flatMap((value) => (typeof value === "string" ? [value] : [])),
  ...SIGN_IN_CODES.map(signInErrorMessage),
  ...DEMO_CODES.map(demoSignInErrorMessage),
  ...Object.values(DEMO_MESSAGES),
  ...Object.values(LOCATION_MESSAGES),
  ...Object.values(POSTING_PROBLEM_MESSAGES),
  ...Object.values(TERMS_MESSAGES),
  ...Object.values(TRYOUT_MESSAGES),
  ...Object.values(TRYOUT_FIELD_MESSAGES),
  ...Object.values(BOOKING_MESSAGES),
  pinPrecisionText(20),
  UPLOAD_COPY.slow,
];

describe("error copy follows the copy rules", () => {
  it.each(everyMessage)("%s", (message) => {
    expect(message).not.toMatch(/—|sorry|apolog|unfortunately|oops|!/i);
    // A question only where the answer is the person's choice ("Offer them a job instead?").
    expect(message).toMatch(/[.?]$/);
  });

  it("names buttons only by their exact labels", () => {
    // Longest first, so "Try again" is matched whole rather than stopping at a shorter label.
    const labels: string[] = Object.values(BUTTON_LABELS).sort((a, b) => b.length - a.length);
    for (const message of everyMessage) {
      // "tap X" or "tap X or Y": each must start with a real label. Our labels are capitalised; "tap the icon" is the browser's own.
      for (const match of message.matchAll(/\b[Tt]ap (?=[A-Z])/g)) {
        let rest = message.slice((match.index ?? 0) + match[0].length);
        for (;;) {
          const label = labels.find((candidate) => rest.startsWith(candidate));
          expect(label, `"${rest}" in "${message}"`).toBeDefined();
          rest = rest.slice(label?.length ?? rest.length);
          if (!rest.startsWith(" or ")) break;
          rest = rest.slice(" or ".length);
        }
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
