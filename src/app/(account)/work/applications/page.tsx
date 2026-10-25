import type { Metadata } from "next";
import { Band } from "@/components/ui/Band";
import { ApplicationsList } from "./_components/ApplicationsList";

export const metadata: Metadata = { title: "Your applications on First Shift" };

export default function ApplicationsPage() {
  return (
    <Band tone="paper">
      <ApplicationsList />
    </Band>
  );
}
