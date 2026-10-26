import type { Metadata } from "next";
import { Band } from "@/components/ui/Band";
import { BusinessProfile } from "./_components/BusinessProfile";

export const metadata: Metadata = { title: "Your business on First Shift" };

export default function BusinessProfilePage() {
  return (
    <Band tone="paper">
      <BusinessProfile />
    </Band>
  );
}
