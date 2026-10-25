import type { Metadata } from "next";
import { Band } from "@/components/ui/Band";
import { PageTitle } from "@/components/ui/PageTitle";
import { RoleChoice } from "./_components/RoleChoice";

export const metadata: Metadata = { title: "Get started on First Shift" };

export default function RolePage() {
  return (
    <Band tone="paper">
      <PageTitle title="How will you use First Shift?" intro="Choose one. A Google account can only be one of these." />
      <RoleChoice />
    </Band>
  );
}
