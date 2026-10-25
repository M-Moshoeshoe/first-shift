import type { Metadata } from "next";
import { Band } from "@/components/ui/Band";
import { WorkerProfile } from "./_components/WorkerProfile";

export const metadata: Metadata = { title: "Your profile on First Shift" };

export default function WorkerProfilePage() {
  return (
    <Band tone="paper">
      <WorkerProfile />
    </Band>
  );
}
