import type { Metadata } from "next";
import { Band } from "@/components/ui/Band";
import { WorkRecord } from "./_components/WorkRecord";

export const metadata: Metadata = { title: "Your work record on First Shift" };

export default function WorkRecordPage() {
  return (
    <Band tone="paper">
      <WorkRecord />
    </Band>
  );
}
