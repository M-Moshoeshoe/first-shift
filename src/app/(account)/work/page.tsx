import type { Metadata } from "next";
import { Band } from "@/components/ui/Band";
import { PageShell } from "@/components/ui/PageShell";
import { WorkHome } from "./_components/WorkHome";

export const metadata: Metadata = { title: "Your tryouts on First Shift" };

export default function WorkPage() {
  return (
    <PageShell>
      <Band tone="paper">
        <WorkHome />
      </Band>
    </PageShell>
  );
}
