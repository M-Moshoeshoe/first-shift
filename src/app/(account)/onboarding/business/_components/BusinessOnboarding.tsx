"use client";

import { useGatedProfile } from "@/lib/auth/gatedProfile";
import { BusinessFlow } from "./BusinessFlow";

/** The business form. ProfileGate has already loaded the profile and checked this is the owner's next step. */
export function BusinessOnboarding() {
  return <BusinessFlow view={useGatedProfile()} />;
}
