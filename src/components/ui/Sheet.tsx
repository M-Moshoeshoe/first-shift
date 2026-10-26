"use client";

import type { ReactNode, RefObject } from "react";

/**
 * A bottom sheet on a native dialog: showModal() moves focus in and makes the
 * page behind inert, Escape and a tap on the backdrop close it, and it costs
 * no library. It enters with sheet-enter (docs/DESIGN.md, Motion 3) and closes
 * at once. Open it with sheetRef.current?.showModal().
 */
export function Sheet({ sheetRef, title, children }: { sheetRef: RefObject<HTMLDialogElement | null>; title: string; children: ReactNode }) {
  const close = () => sheetRef.current?.close();
  const headingId = `${title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-sheet`;
  return (
    <dialog
      ref={sheetRef}
      aria-labelledby={headingId}
      // A tap on the backdrop lands on the dialog itself, not its content: that closes it.
      onClick={(event) => event.target === event.currentTarget && close()}
      className="fixed inset-x-0 top-auto bottom-0 m-0 mx-auto max-h-[90dvh] w-full max-w-none overflow-y-auto border border-b-0 border-line bg-paper p-0 text-ink open:animate-sheet-enter backdrop:bg-ink/40 lg:max-w-md"
    >
      <div className="flex flex-col gap-4 px-5 pt-6 pb-8">
        <h2 id={headingId} className="text-xl font-bold">
          {title}
        </h2>
        {children}
        <button type="button" onClick={close} className="min-h-11 w-full border border-ink text-base font-semibold">
          Close
        </button>
      </div>
    </dialog>
  );
}
