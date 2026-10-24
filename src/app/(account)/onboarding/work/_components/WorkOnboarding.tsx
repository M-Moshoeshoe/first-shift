"use client";

import { useGatedProfile } from "@/lib/auth/gatedProfile";
import { WorkFlow } from "./WorkFlow";

/** The young person's form. ProfileGate has already loaded the profile and checked this is their next step. */
export function WorkOnboarding() {
  return <WorkFlow view={useGatedProfile()} />;
}
