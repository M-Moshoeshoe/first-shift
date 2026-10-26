"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

/**
 * Shows `later` instead of `before` once the element first scrolls into view,
 * and keeps it: a Stamp inside `later` mounts then, so it lands once, in
 * front of the reader, not off screen at load. No scroll listener: an
 * IntersectionObserver, disconnected after the first sighting.
 */
export function OnView({ before, later }: { before: ReactNode; later: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const [seen, setSeen] = useState(false);
  useEffect(() => {
    const node = ref.current;
    if (!node || seen) return undefined;
    const observer = new IntersectionObserver(([entry]) => {
      if (!entry?.isIntersecting) return;
      setSeen(true);
      observer.disconnect();
    }, { threshold: 0.6 });
    observer.observe(node);
    return () => observer.disconnect();
  }, [seen]);
  return <div ref={ref}>{seen ? later : before}</div>;
}
