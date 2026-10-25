import type { ReactNode } from "react";
import { ProfileGate } from "@/components/ProfileGate";

/** Onboarding is open only to the person whose next step it is (ProfileGate). */
export default function OnboardingLayout({ children }: { children: ReactNode }) {
  return <ProfileGate>{children}</ProfileGate>;
}
