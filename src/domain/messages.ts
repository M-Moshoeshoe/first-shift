import type { LocationProblem, PhotoKind } from "./profile";
import type { ProfileProblem } from "./profileDecisions";
import type { Role } from "./roles";
import type { IdProblem } from "./saId";
import { BUTTON_LABELS } from "./buttonLabels";

/*
 * Every sentence a person sees when something goes wrong. A message that
 * tells someone to tap a button uses the exact label from buttonLabels.ts.
 * Copy rules: AGENTS.md.
 */

/** Shown wherever a message contains it, as a link to SUPPORT_EMAIL (src/config/contact.ts). */
export const CONTACT_PHRASE = "contact us";

export const ID_HINT =
  "We check your ID number so businesses know you're 18 or older and allowed to work. We keep only the last four digits and a scrambled code that can't be turned back into your number.";

export const ID_PROBLEM_MESSAGES: Record<IdProblem, string> = {
  format: "Your ID number must be 13 digits. Check it against your ID and type it again.",
  date_of_birth: "The first 6 digits of your ID number aren't a real date of birth. Check them against your ID.",
  citizenship_digit: "The 11th digit of your ID number must be 0 or 1. Check it against your ID. Refugee IDs and permits can't be used yet.",
  check_digit: "That ID number isn't valid, so one digit is probably wrong. Check it against your ID and type it again.",
  under_age: "You need to be 18 or older to do tryouts. You can sign up from your 18th birthday.",
};

const SAVE_BUTTON: Record<PhotoKind, string> = { profile: BUTTON_LABELS.saveMyProfile, shopfront: BUTTON_LABELS.saveMyBusiness };

export const PROFILE_MESSAGES = {
  idInUse: `This ID number is already linked to another First Shift account. Sign in with the Google account you used before. If that wasn't you, ${CONTACT_PHRASE}.`,
  idLocked: `Your account already has a different ID number. If you entered the wrong ID number, ${CONTACT_PHRASE} to correct it.`,
  idChecksOff: "ID checks aren't working on this site right now, so nothing was saved. Try again later.",
  roleMissing: "Choose whether you're looking for work or running a business first.",
  roleLocked: {
    young_person: "This account is already set up to look for work. To run a business on First Shift, sign in with a different Google account.",
    business: "This account is already set up for a business. To look for work, sign in with a different Google account.",
  } satisfies Record<Role, string>,
  photoMissing: (kind: PhotoKind) => `Your photo didn't finish uploading. Take or choose it again, then tap ${SAVE_BUTTON[kind]}.`,
  photoWrongType: "Your photo must be a JPEG, PNG or WebP picture. Take or choose a different photo.",
  photoTooBig: "Your photo is bigger than 2 MB. Take or choose a smaller photo.",
  detailsFirst: "Save your details first, then add your photo.",
  pinMissing: `Your profile is saved. To finish, come back and tap ${BUTTON_LABELS.useMyLocation} while you're at the business.`,
  fallback: "Some of your details couldn't be saved. Check the form and try again.",
  // Step 5 additions, for review.
  photoUnreadable: `This photo can't be opened on this phone. Tap ${BUTTON_LABELS.openTheCamera} and take it again.`,
  photoNeeded: `Add a photo of your face first. Tap ${BUTTON_LABELS.openTheCamera}, then ${BUTTON_LABELS.takeThePhoto}.`,
  profileUnavailable: `Your profile didn't load. Check your connection, then tap ${BUTTON_LABELS.tryAgain}.`,
  // Step 6 additions, for review.
  shopfrontNeeded: `Add a photo of your shopfront first. Tap ${BUTTON_LABELS.openTheCamera} or ${BUTTON_LABELS.chooseAPhoto}.`,
  pinImprecise: `Your location isn't precise enough yet. Step outside or turn on your phone's location, then tap ${BUTTON_LABELS.useMyLocation} again.`,
  // Approved in step 3; moved here when the Sign out button became shared.
  signOutFailed: `We couldn't sign you out. Check your connection, then tap ${BUTTON_LABELS.signOut} again.`,
  surnameLocked: `Your surname is already saved. If it's wrong, ${CONTACT_PHRASE} to correct it.`,
  // Demo isolation, for review.
  demoLocked: `This is a demo account, so its profile is set up for you and can't be changed. To make your own, tap ${BUTTON_LABELS.signOut} and ${BUTTON_LABELS.continueWithGoogle}.`,
} as const;

/** Step 6, for review: why a premises pin couldn't be taken, and what to do. */
export const LOCATION_MESSAGES: Record<LocationProblem, string> = {
  denied: `Location is blocked for First Shift. Tap the icon next to the web address, choose Permissions, and turn on Location. Then tap ${BUTTON_LABELS.useMyLocation} again.`,
  unavailable: `Your phone couldn't find where you are. Step outside or turn on your phone's location, then tap ${BUTTON_LABELS.useMyLocation} again.`,
  timeout: `Your phone took too long to find where you are. Step outside or turn on your phone's location, then tap ${BUTTON_LABELS.useMyLocation} again.`,
  unsupported: `This browser can't share your location. Open First Shift in Chrome or Samsung Internet to add your pin, or tap ${BUTTON_LABELS.skipForNow}.`,
  imprecise: PROFILE_MESSAGES.pinImprecise,
};

/** Step 6, for review: what "Use my location" says while it works. */
export const LOCATION_COPY = {
  finding: "Finding your location",
  saving: "Saving your pin",
  notPinned: "Not pinned yet",
} as const;

/** "Pinned to within 20 metres." Whole metres, rounded up so it never claims more precision than it has. */
export function pinPrecisionText(accuracyMetres: number): string {
  const metres = Math.max(1, Math.ceil(accuracyMetres));
  return `Pinned to within ${metres} ${metres === 1 ? "metre" : "metres"}.`;
}

export function profileProblemMessage(problem: ProfileProblem): string {
  switch (problem.code) {
    case "role_missing":
      return PROFILE_MESSAGES.roleMissing;
    case "role_locked":
      return PROFILE_MESSAGES.roleLocked[problem.current];
    case "id_in_use":
      return PROFILE_MESSAGES.idInUse;
    case "id_locked":
      return PROFILE_MESSAGES.idLocked;
    case "details_first":
      return PROFILE_MESSAGES.detailsFirst;
    case "photo_missing":
      return PROFILE_MESSAGES.photoMissing(problem.kind);
    case "photo_wrong_type":
      return PROFILE_MESSAGES.photoWrongType;
    case "photo_too_big":
      return PROFILE_MESSAGES.photoTooBig;
    case "pin_imprecise":
      return PROFILE_MESSAGES.pinImprecise;
    case "surname_locked":
      return PROFILE_MESSAGES.surnameLocked;
    case "demo_locked":
      return PROFILE_MESSAGES.demoLocked;
  }
}

/** What the photo button says while it works, and the line that appears when an upload is slow. */
export const UPLOAD_COPY = {
  preparing: "Getting your photo ready",
  uploading: (percent: number | null) => (percent === null ? "Uploading your photo" : `Uploading your photo, ${percent}%`),
  slow: "Your connection is slow. Keep this page open.",
} as const;

export const FIELD_MESSAGES = {
  firstNameEmpty: "Enter your first name.",
  firstNameLong: "Your first name can be up to 40 letters.",
  workerArea: "Enter the area you live in, like Ivory Park or Tembisa.",
  availability: "Choose at least one time you can work.",
  payoutPhone: "Enter a South African cellphone number, like 082 123 4567.",
  payMethods: "Choose at least one way businesses can pay you.",
  skills: "Choose at least one kind of work you can do, up to 4.",
  languages: "Choose at least one language you speak.",
  introLong: "Your introduction can be up to 120 characters. Make it shorter.",
  surname: "Enter your surname as it is on your ID.",
  legalName: "Enter your full name as it is on your ID, first name and surname.",
  cipc: "Enter the CIPC number like 2015/123456/07, or leave it empty.",
  businessName: "Enter your business name.",
  businessArea: "Enter the area your business is in, like Midrand.",
  openingHours: "Enter your opening hours, like Monday to Saturday, 8:00 to 17:00.",
  coida: "Choose whether you're registered with the Compensation Fund. If you don't know, choose I'm not sure.",
  pinOutsideSa: `That location isn't in South Africa. Tap ${BUTTON_LABELS.useMyLocation} again while you're at the business.`,
} as const;

const SIGN_IN_MESSAGES: Record<string, string> = {
  "auth/popup-blocked": `Your browser blocked the Google sign-in window. Allow pop-ups for this site, then tap ${BUTTON_LABELS.continueWithGoogle} again.`,
  "auth/popup-closed-by-user": `The Google sign-in window closed before you finished. Tap ${BUTTON_LABELS.continueWithGoogle} to try again.`,
  "auth/cancelled-popup-request": `The Google sign-in window closed before you finished. Tap ${BUTTON_LABELS.continueWithGoogle} to try again.`,
  "auth/user-cancelled": `You cancelled signing in with Google. Tap ${BUTTON_LABELS.continueWithGoogle} to try again.`,
  "auth/network-request-failed": `We couldn't reach Google. Check your connection, then tap ${BUTTON_LABELS.continueWithGoogle} again.`,
  "auth/too-many-requests": "There have been too many sign-in attempts from this phone. Wait a few minutes, then try again.",
  "auth/unauthorized-domain": "Google sign-in isn't switched on for this web address yet. Use the main First Shift site, or ask the team to add this address.",
};

/** One plain sentence for each way Google sign-in can fail, saying what happened and what to do. */
export function signInErrorMessage(code: string): string {
  return SIGN_IN_MESSAGES[code] ?? `Google sign-in didn't finish. Tap ${BUTTON_LABELS.continueWithGoogle} to try again.`;
}

/** The demo sign-in's own refusal, from the server (server/services/demoSignInService.ts). */
export const DEMO_MESSAGES = {
  wrongCredentials: "That email and password don't match a demo account. Check them, then try again.",
} as const;

const DEMO_SIGN_IN_MESSAGES: Record<string, string> = {
  "auth/invalid-custom-token": `The demo sign-in didn't finish. Tap ${BUTTON_LABELS.signInToDemo} to try again.`,
  "auth/user-disabled": "That demo account is switched off. Ask the First Shift team for a working one.",
  "auth/too-many-requests": "There have been too many sign-in attempts from this phone. Wait a few minutes, then try again.",
  "auth/network-request-failed": `We couldn't reach First Shift. Check your connection, then tap ${BUTTON_LABELS.signInToDemo} again.`,
};

/** The same for the last step of a demo sign-in, when the browser signs in with the server's token. */
export function demoSignInErrorMessage(code: string): string {
  return DEMO_SIGN_IN_MESSAGES[code] ?? `The demo sign-in didn't finish. Tap ${BUTTON_LABELS.signInToDemo} to try again.`;
}

/** Splits a message around "contact us" (any case) so the UI can make it a link. Null when it isn't there. */
export function splitContactLink(message: string): { before: string; phrase: string; after: string } | null {
  const at = message.toLowerCase().indexOf(CONTACT_PHRASE);
  if (at === -1) return null;
  return { before: message.slice(0, at), phrase: message.slice(at, at + CONTACT_PHRASE.length), after: message.slice(at + CONTACT_PHRASE.length) };
}
