import type { Metadata } from "next";
import { Band } from "@/components/ui/Band";
import { PageShell } from "@/components/ui/PageShell";
import { RoleChoice } from "./_components/RoleChoice";

export const metadata: Metadata = { title: "Get started on First Shift" };

export default function RolePage() {
  return (
    <PageShell>
      <Band tone="paper">
        <div className="flex flex-col gap-4">
          <h1 className="text-4xl font-bold leading-tight tracking-title">How will you use First Shift?</h1>
          <p className="text-lg text-muted">Choose one. A Google account can only be one of these.</p>
        </div>
        <RoleChoice />
      </Band>
    </PageShell>
  );
}
