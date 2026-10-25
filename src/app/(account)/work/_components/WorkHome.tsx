"use client";

import { PageTitle } from "@/components/ui/PageTitle";
import { useGatedProfile } from "@/lib/auth/gatedProfile";
import { useHeadingFocus } from "@/lib/useHeadingFocus";

/** A young person's home until Phase 3 adds the tryout feed. Focus starts on the greeting. */
export function WorkHome() {
  const { worker } = useGatedProfile();
  const heading = useHeadingFocus(true);
  return <PageTitle headingRef={heading} title={`Hi ${worker?.firstName ?? ""}`} intro="Paid tryouts near you will show up here soon." />;
}
