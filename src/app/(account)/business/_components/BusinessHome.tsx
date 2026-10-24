"use client";

import { SignOutButton } from "@/components/SignOutButton";
import { useGatedProfile } from "@/lib/auth/gatedProfile";
import { useHeadingFocus } from "@/lib/useHeadingFocus";

/** An owner's home until Phase 2 adds posting. Focus starts on the business name. */
export function BusinessHome() {
  const { business } = useGatedProfile();
  const heading = useHeadingFocus(true);
  return (
    <>
      <div className="flex flex-col gap-4">
        <h1 ref={heading} tabIndex={-1} className="text-4xl font-bold leading-tight tracking-title">
          {business?.name}
        </h1>
        <p className="text-lg text-muted">You&apos;ll post your first tryout from here soon.</p>
      </div>
      <SignOutButton />
    </>
  );
}
