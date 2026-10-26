import type { Metadata } from "next";
import { Band } from "@/components/ui/Band";
import { OwnerDetails } from "./_components/OwnerDetails";

export const metadata: Metadata = { title: "Your details as the owner on First Shift" };

export default function OwnerPage() {
  return (
    <Band tone="paper">
      <OwnerDetails />
    </Band>
  );
}
