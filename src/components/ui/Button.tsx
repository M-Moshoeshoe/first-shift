import type { ButtonHTMLAttributes, MouseEvent } from "react";

export type ButtonVariant = "primary" | "secondary" | "stop" | "quiet";

// Press feedback is the first of the allowed motions (docs/DESIGN.md).
const base = "flex items-center justify-center font-bold transition-transform duration-(--dur-fast) ease-out active:scale-97 disabled:cursor-not-allowed";

const variants: Record<ButtonVariant, string> = {
  // The only place primary green is applied (docs/DESIGN.md).
  primary: "min-h-13 w-full bg-primary px-5 text-lg text-on-primary",
  secondary: "min-h-11 w-full border-2 border-ink px-5 text-lg text-ink",
  // Undoing something: a stop-coloured outline, never a filled red button (docs/DESIGN.md, Colour).
  stop: "min-h-11 w-full border-2 border-stop px-5 text-lg text-stop",
  // A text action in the header: still a 44 px target, underlined so it reads as tappable.
  quiet: "min-h-11 px-1 text-base text-ink underline underline-offset-4",
};

/** Button styles, shared with links that act as buttons so both look, size and press the same. */
export function buttonClass(variant: ButtonVariant = "primary"): string {
  return `${base} ${variants[variant]}`;
}

// Module-level and attached only while busy, so server-rendered buttons carry no handler.
const ignoreRepeatTap = (event: MouseEvent<HTMLButtonElement>) => event.preventDefault();

interface ButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "className"> {
  variant?: ButtonVariant;
  /**
   * Work is in progress: shows busyLabel, sets aria-busy and cancels every
   * further tap, including the Enter key in a form, so nothing is sent twice.
   */
  busy?: boolean;
  busyLabel?: string;
}

export function Button({ variant = "primary", busy = false, busyLabel, type = "button", onClick, children, ...props }: ButtonProps) {
  return (
    <button {...props} type={type} aria-busy={busy || undefined} onClick={busy ? ignoreRepeatTap : onClick} className={buttonClass(variant)}>
      {busy && busyLabel ? busyLabel : children}
    </button>
  );
}
