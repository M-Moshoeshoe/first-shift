/** A short confirmation, such as "Saved" or "Offer sent": Toaster (in AppShell) shows it and a screen reader reads it. */
export const TOAST_EVENT = "first-shift:toast";

export function toast(message: string): void {
  window.dispatchEvent(new CustomEvent<string>(TOAST_EVENT, { detail: message }));
}
