/**
 * The branded cover shown between signing in or out and the next screen
 * (SessionCover, in the account layout, so it stays up across the
 * navigation). Turned on by setting data-session on it: no React state, so
 * every account screen pays only for these few lines.
 */
export const SESSION_COVER_ID = "session-cover";

export type SessionChange = "in" | "out";

const cover = () => document.getElementById(SESSION_COVER_ID);

/** Called the moment sign-in or sign-out succeeds, so the form never shows again in between. */
export function showSessionCover(change: SessionChange): void {
  cover()?.setAttribute("data-session", change);
}

/** Called once the next screen has drawn, or when something failed and the screen must say so. Pass a change to clear only that one. */
export function hideSessionCover(change?: SessionChange): void {
  const element = cover();
  if (element && (!change || element.getAttribute("data-session") === change)) element.removeAttribute("data-session");
}
