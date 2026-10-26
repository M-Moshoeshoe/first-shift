import type { ReactNode } from "react";

/** Our gold clipboard: the one picture of AI in the product. */
export function AiClipboard({ size = 20 }: { size?: number }) {
  return (
    <svg aria-hidden="true" width={size} height={size} viewBox="0 0 28 28" className="shrink-0">
      <rect x="5" y="4" width="18" height="22" fill="var(--color-gold)" stroke="var(--color-ink)" strokeWidth="1.5" />
      <rect x="10" y="2" width="8" height="5" fill="var(--color-paper)" stroke="var(--color-ink)" strokeWidth="1.5" />
      <path d="M9 13h10M9 17h10M9 21h6" stroke="var(--color-ink)" strokeWidth="1.5" />
    </svg>
  );
}

/**
 * The AI mark: the clipboard, a small "AI" label and one line saying what the
 * AI did. Used wherever AI contributes and nowhere else (docs/DESIGN.md, AI):
 * drafts, the safety check, and references. Never on anything our own rules
 * work out, such as the show-up score.
 */
export function AiMark({ children }: { children: ReactNode }) {
  return (
    <p className="flex items-center gap-2 text-sm text-muted">
      <AiClipboard />
      <span className="border border-ink px-1 text-micro font-bold text-ink">AI</span>
      <span>{children}</span>
    </p>
  );
}
