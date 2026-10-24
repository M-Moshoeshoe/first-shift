import type { Metadata } from "next";
import { Band } from "@/components/ui/Band";
import { PageShell } from "@/components/ui/PageShell";
import { BusinessHome } from "./_components/BusinessHome";

export const metadata: Metadata = { title: "Your business on First Shift" };

export default function BusinessPage() {
  return (
    <PageShell>
      <Band tone="paper">
        <BusinessHome />
      </Band>
    </PageShell>
  );
}
