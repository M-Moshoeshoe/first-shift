import type { z } from "zod";

/** The first message for each field, keyed by field name. Only fields the form lists are kept. */
export function fieldErrors<K extends string>(error: z.ZodError, fields: readonly K[]): Partial<Record<K, string>> {
  const errors: Partial<Record<K, string>> = {};
  for (const issue of error.issues) {
    const field = fields.find((name) => name === issue.path[0]);
    if (field && !errors[field]) errors[field] = issue.message;
  }
  return errors;
}

/** The first field, in the order the form shows them, that has an error. */
export function firstInvalid<K extends string>(errors: Partial<Record<K, string>>, fields: readonly K[]): K | null {
  return fields.find((field) => Boolean(errors[field])) ?? null;
}

/**
 * Motion 4: the field shakes once (data-shaking, styled in globals.css) and
 * focus moves to its first input, so a screen reader reads the label and the
 * error together. Reduced motion makes the shake instant; focus still moves.
 */
export function shakeAndFocus(fieldId: string): void {
  const field = document.querySelector<HTMLElement>(`[data-field="${CSS.escape(fieldId)}"]`);
  if (!field) return;
  field.removeAttribute("data-shaking");
  void field.offsetWidth; // restart the animation if it is already set
  field.setAttribute("data-shaking", "");
  const stop = (event: AnimationEvent) => {
    if (event.animationName !== "field-shake") return;
    field.removeAttribute("data-shaking");
    field.removeEventListener("animationend", stop);
  };
  field.addEventListener("animationend", stop);
  field.querySelector<HTMLElement>("input, select, textarea, button")?.focus();
}
