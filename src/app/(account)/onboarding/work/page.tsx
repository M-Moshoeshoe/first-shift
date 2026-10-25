import type { Metadata } from "next";
import { Band } from "@/components/ui/Band";
import { PageTitle } from "@/components/ui/PageTitle";
import { WorkOnboarding } from "./_components/WorkOnboarding";

export const metadata: Metadata = { title: "Your work profile on First Shift" };

export default function WorkOnboardingPage() {
  return (
    <Band tone="paper">
      <PageTitle title="Your work profile" intro="Three short steps. Businesses see your first name, your area and your photo." />
      <WorkOnboarding />
    </Band>
  );
}
