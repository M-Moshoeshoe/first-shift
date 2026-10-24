import type { Metadata } from "next";
import { Band } from "@/components/ui/Band";
import { PageShell } from "@/components/ui/PageShell";
import { WorkOnboarding } from "./_components/WorkOnboarding";

export const metadata: Metadata = { title: "Your work profile on First Shift" };

export default function WorkOnboardingPage() {
  return (
    <PageShell>
      <Band tone="paper">
        <div className="flex flex-col gap-4">
          <h1 className="text-4xl font-bold leading-tight tracking-title">Your work profile</h1>
          <p className="text-lg text-muted">Three short steps. Businesses see your first name, your area and your photo.</p>
        </div>
        <WorkOnboarding />
      </Band>
    </PageShell>
  );
}
