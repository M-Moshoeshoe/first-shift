"use client";

import { OnboardingLoader } from "@/components/OnboardingLoader";
import { WorkFlow } from "./WorkFlow";

/** The young person's form, once their own profile has loaded. */
export function WorkOnboarding() {
  return <OnboardingLoader role="young_person" home="/work" render={(view) => <WorkFlow view={view} />} />;
}
