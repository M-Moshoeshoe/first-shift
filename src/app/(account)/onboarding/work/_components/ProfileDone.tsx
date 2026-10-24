"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { Stamp } from "@/components/ui/Stamp";

/** Long enough to see the Stamp land and read the line under it. */
const PAUSE_MS = 1400;

/** The Stamp, announced as a status, then on to /work. */
export function ProfileDone() {
  const router = useRouter();
  useEffect(() => {
    const timer = setTimeout(() => router.replace("/work"), PAUSE_MS);
    return () => clearTimeout(timer);
  }, [router]);

  return (
    <div role="status" className="flex flex-col items-start gap-4 py-4">
      <Stamp label="Profile done" />
      <p className="text-lg">Taking you to tryouts near you.</p>
    </div>
  );
}
