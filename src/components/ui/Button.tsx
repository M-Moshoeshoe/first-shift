import type { ButtonHTMLAttributes, MouseEvent } from "react";

export type ButtonVariant = "primary" | "secondary";

// Press feedback is the first of the four allowed motions (docs/DESIGN.md).
const base =
  "flex w-full items-center justify-center px-5 text-lg font-bold transition-transform duration-(--dur-fast) ease-out active:scale-97 disabled:cursor-not-allowed";

const variants: Record<ButtonVariant, string> = {
  // The only place primary green is applied (docs/DESIGN.md).
  primary: "min-h-13 bg-primary text-on-primary",
  secondary: "min-h-11 border-2 border-ink text-ink",
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
