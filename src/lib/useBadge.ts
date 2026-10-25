"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

/**
 * How many things wait for this person (GET /api/badges), read again on every
 * screen they open, since push alerts are cut. The request code loads only
 * when there's a nav to badge, so the sign-in page stays light. A failed read
 * shows no badge: the screens themselves still show everything.
 */
export function useBadge(enabled: boolean): number {
  const pathname = usePathname();
  const [count, setCount] = useState(0);
  useEffect(() => {
    if (!enabled) return undefined;
    let current = true;
    Promise.all([import("./api"), import("@/schemas/booking")])
      .then(([{ apiGet }, { BadgesSchema }]) => apiGet("/api/badges", BadgesSchema))
      .then(
        ({ count: next }) => current && setCount(next),
        () => current && setCount(0),
      );
    return () => {
      current = false;
    };
  }, [enabled, pathname]);
  return count;
}
