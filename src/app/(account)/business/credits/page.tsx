import type { Metadata } from "next";
import { Band } from "@/components/ui/Band";
import { CreditsScreen } from "./_components/CreditsScreen";

export const metadata: Metadata = { title: "Your credits on First Shift" };

export default function CreditsPage() {
  return (
    <Band tone="paper">
      <CreditsScreen />
    </Band>
  );
}
