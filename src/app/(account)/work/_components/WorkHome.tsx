"use client";

import { SignOutButton } from "@/components/SignOutButton";
import { useGatedProfile } from "@/lib/auth/gatedProfile";
import { useHeadingFocus } from "@/lib/useHeadingFocus";

/** A young person's home until Phase 3 adds the tryout feed. Focus starts on the greeting. */
export function WorkHome() {
  const { worker } = useGatedProfile();
  const heading = useHeadingFocus(true);
  return (
    <>
      <div className="flex flex-col gap-4">
        <h1 ref={heading} tabIndex={-1} className="text-4xl font-bold leading-tight tracking-title">
          Hi {worker?.firstName}
        </h1>
        <p className="text-lg text-muted">Paid tryouts near you will show up here soon.</p>
      </div>
      <SignOutButton />
    </>
  );
}
