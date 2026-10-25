import type { Metadata } from "next";
import { Band } from "@/components/ui/Band";
import { WorkHome } from "./_components/WorkHome";

export const metadata: Metadata = { title: "Your tryouts on First Shift" };

export default function WorkPage() {
  return (
    <Band tone="paper">
      <WorkHome />
    </Band>
  );
}
