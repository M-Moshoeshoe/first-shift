/**
 * Every button label a message can name. A message that tells someone to tap
 * a button uses the exact label from here (tests/unit/messages.test.ts checks).
 * Its own module, so a screen that needs only labels doesn't load every message.
 */
export const BUTTON_LABELS = {
  continueWithGoogle: "Continue with Google",
  signInToDemo: "Sign in to the demo account",
  tryAsThabo: "Try as Thabo, looking for work",
  tryAsSipho: "Try as Sipho, a business",
  saveMyProfile: "Save my profile",
  saveMyBusiness: "Save my business",
  useMyLocation: "Use my location",
  takeAPhoto: "Take a photo",
  openTheCamera: "Open the camera",
  takeThePhoto: "Take the photo",
  chooseAPhoto: "Choose a photo",
  next: "Next",
  back: "Back",
  skipForNow: "Skip for now",
  lookingForWork: "I'm looking for work",
  runABusiness: "I run a business",
  signOut: "Sign out",
  tryAgain: "Try again",
  goHome: "Go to the home page",
  refresh: "Refresh",
  apply: "Apply",
  withdrawApplication: "Withdraw my application",
  requestMoreCredits: "Request more credits",
} as const;
