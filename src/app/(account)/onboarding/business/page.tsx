import type { Metadata } from "next";
import { Band } from "@/components/ui/Band";
import { PageShell } from "@/components/ui/PageShell";
import { BusinessOnboarding } from "./_components/BusinessOnboarding";

export const metadata: Metadata = { title: "Your business profile on First Shift" };

export default function BusinessOnboardingPage() {
  return (
    <PageShell>
      <Band tone="paper">
        <div className="flex flex-col gap-4">
          <h1 className="text-4xl font-bold leading-tight tracking-title">Your business profile</h1>
          <p className="text-lg text-muted">Three short steps. Young people see your business name, your area and your shopfront photo.</p>
        </div>
        <BusinessOnboarding />
      </Band>
    </PageShell>
  );
}
