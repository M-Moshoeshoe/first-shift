import type { Metadata } from "next";
import { Band } from "@/components/ui/Band";
import { PageTitle } from "@/components/ui/PageTitle";
import { BusinessOnboarding } from "./_components/BusinessOnboarding";

export const metadata: Metadata = { title: "Your business profile on First Shift" };

export default function BusinessOnboardingPage() {
  return (
    <Band tone="paper">
      <PageTitle title="Your business profile" intro="Three short steps. Young people see your business name, your area and your shopfront photo." />
      <BusinessOnboarding />
    </Band>
  );
}
