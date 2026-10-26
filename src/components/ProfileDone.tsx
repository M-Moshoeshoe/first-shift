"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { Stamp } from "@/components/ui/Stamp";

/** Long enough to see the Stamp land and read the line under it. */
const PAUSE_MS = 1400;

const LINES = {
  "/work": "Taking you to tryouts near you.",
  "/business": "Taking you to your business page.",
} as const;

/** The Stamp, announced as a status, then on to the person's home screen. Used by both onboarding forms. */
export function ProfileDone({ next }: { next: keyof typeof LINES }) {
  const router = useRouter();
  useEffect(() => {
    const timer = setTimeout(() => router.replace(next), PAUSE_MS);
    return () => clearTimeout(timer);
  }, [router, next]);

  return (
    <div role="status" className="flex flex-col items-start gap-4 py-4">
      <Stamp label="Profile done" />
      <p className="text-base">{LINES[next]}</p>
    </div>
  );
}
