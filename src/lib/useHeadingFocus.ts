"use client";

import { useEffect, useRef } from "react";

/**
 * Moves focus to a step's heading when the person arrives from another step,
 * so a screen reader announces where they are. Not on first load, where focus
 * stays at the top of the page.
 */
export function useHeadingFocus<T extends HTMLElement = HTMLHeadingElement>(enabled: boolean) {
  const heading = useRef<T>(null);
  useEffect(() => {
    if (enabled) heading.current?.focus();
  }, [enabled]);
  return heading;
}
