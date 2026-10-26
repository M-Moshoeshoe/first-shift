"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";

/**
 * A thin green bar at the top of the screen while a tap on a link is still
 * loading the next screen (docs/DESIGN.md, Motion 16). Our own, no library and
 * no timer: a click on an internal link turns it on, the new address turns it
 * off, and CSS holds it back for 150 ms so a fast navigation never shows it.
 * It grows by transform only. With reduced motion it stays hidden: the
 * screen's skeleton says it is loading. Decorative for screen readers too.
 */
export function NavProgress() {
  const pathname = usePathname();
  const bar = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const link = event.target instanceof Element ? event.target.closest("a") : null;
      if (!link || link.target || link.hasAttribute("download")) return;
      const url = new URL(link.href, window.location.href);
      if (url.origin !== window.location.origin || url.pathname === window.location.pathname) return;
      bar.current?.setAttribute("data-on", "");
    };
    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, []);

  // The new screen is here: the bar goes at once, with no transition.
  useEffect(() => {
    bar.current?.removeAttribute("data-on");
  }, [pathname]);

  return (
    <div
      ref={bar}
      aria-hidden="true"
      className="pointer-events-none fixed inset-x-0 top-0 z-50 h-0.5 origin-left scale-x-0 bg-primary opacity-0 data-on:scale-x-[0.8] data-on:opacity-100 data-on:[transition:transform_2s_var(--ease-out)_150ms,opacity_0s_linear_150ms] motion-reduce:hidden"
    />
  );
}
