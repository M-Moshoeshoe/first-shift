"use client";

import { OnboardingLoader } from "@/components/OnboardingLoader";
import { BusinessFlow } from "./BusinessFlow";

/** The business form, once the owner's own profile has loaded. */
export function BusinessOnboarding() {
  return <OnboardingLoader role="business" home="/business" render={(view) => <BusinessFlow view={view} />} />;
}
