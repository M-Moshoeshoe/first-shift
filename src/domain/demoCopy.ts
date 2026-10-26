/**
 * The demo's own words: the banner on every demo screen, Skip to the day and
 * Reset the demo. Nothing here is ever shown to a real account.
 */
export const DEMO_COPY = {
  banner: "Demo account. Everything here is made up.",
  skip: "Skip to the day",
  skipBusy: "Moving the day",
  skipHint: "Demo only: this moves the tryout to start a few minutes ago, so you can try check-in, pay and the reference now.",
  skipFailed: "The day did not move. Check your connection, then tap Skip to the day again.",
  skipNotBooked: "Only a booked tryout can skip to its day.",
  notDemo: "Only the demo accounts can do this.",
  reset: "Reset the demo",
  resetConfirm: "This puts the whole demo back to the start, for everyone using it. Reset it now?",
  resetYes: "Yes, reset the demo",
  resetNo: "Keep going",
  resetBusy: "Resetting",
  resetDone: "The demo is back to the start.",
  resetFailed: "The demo did not reset. Check your connection, then try again.",
  resetTooSoon: "The demo was reset less than a minute ago. Wait a minute, then try again.",
} as const;
