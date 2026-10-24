"use client";

import { SignOutButton } from "@/components/SignOutButton";
import { PageTitle } from "@/components/ui/PageTitle";
import { useGatedProfile } from "@/lib/auth/gatedProfile";
import { useHeadingFocus } from "@/lib/useHeadingFocus";

/** An owner's home until Phase 2 adds posting. Focus starts on the business name. */
export function BusinessHome() {
  const { business } = useGatedProfile();
  const heading = useHeadingFocus(true);
  return (
    <>
      <PageTitle headingRef={heading} title={business?.name} intro="You'll post your first tryout from here soon." />
      <SignOutButton />
    </>
  );
}
