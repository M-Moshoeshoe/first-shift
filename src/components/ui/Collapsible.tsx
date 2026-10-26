import type { ReactNode } from "react";

/**
 * A section that folds: native details and summary, so it opens and closes
 * with no JavaScript and works with a keyboard and a screen reader. The
 * heading carries a count when there is one ("Past (4)").
 */
export function Collapsible({ title, count, open = true, boxed = false, children }: { title: string; count?: number; open?: boolean; boxed?: boolean; children: ReactNode }) {
  return (
    <details open={open} className={`group flex flex-col ${boxed ? "border border-line px-4" : ""}`}>
      <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-4 text-base font-bold [&::-webkit-details-marker]:hidden">
        <span>
          {title}
          {count === undefined ? null : <span className="font-normal text-muted tabular-nums"> ({count})</span>}
        </span>
        <span aria-hidden="true" className="text-xl leading-none font-normal group-open:hidden">
          +
        </span>
        <span aria-hidden="true" className="hidden text-xl leading-none font-normal group-open:inline">
          −
        </span>
      </summary>
      <div className={`flex flex-col gap-2 pt-2 ${boxed ? "pb-4" : ""}`}>{children}</div>
    </details>
  );
}
