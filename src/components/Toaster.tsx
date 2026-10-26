"use client";

import { useEffect, useState } from "react";
import { TOAST_EVENT } from "@/lib/toast";

const SHOWN_MS = 3000;
const LEAVE_MS = 200;

/**
 * Quick confirmations (lib/toast.ts) in a polite live region that is always
 * on the page, so a screen reader announces each one. A toast enters from
 * below, stays three seconds, then fades out (motion 14). Above the tab bar on
 * a phone. Errors never go here: they stay next to what caused them.
 */
export function Toaster() {
  const [toast, setToast] = useState<{ message: string; leaving: boolean } | null>(null);

  useEffect(() => {
    let leave: ReturnType<typeof setTimeout> | undefined;
    let gone: ReturnType<typeof setTimeout> | undefined;
    const show = (event: Event) => {
      clearTimeout(leave);
      clearTimeout(gone);
      setToast({ message: (event as CustomEvent<string>).detail, leaving: false });
      leave = setTimeout(() => setToast((current) => (current ? { ...current, leaving: true } : null)), SHOWN_MS);
      gone = setTimeout(() => setToast(null), SHOWN_MS + LEAVE_MS);
    };
    window.addEventListener(TOAST_EVENT, show);
    return () => {
      window.removeEventListener(TOAST_EVENT, show);
      clearTimeout(leave);
      clearTimeout(gone);
    };
  }, []);

  return (
    <div role="status" aria-live="polite" className="pointer-events-none fixed inset-x-0 bottom-20 z-40 flex justify-center px-5 lg:bottom-8">
      {toast ? <p className={`bg-ink px-4 py-3 text-sm font-semibold text-paper ${toast.leaving ? "animate-toast-out" : "animate-toast-in"}`}>{toast.message}</p> : null}
    </div>
  );
}
