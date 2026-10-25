import type { Metadata } from "next";
import { Band } from "@/components/ui/Band";
import { OwnerTryout } from "./_components/OwnerTryout";

export const metadata: Metadata = { title: "Your tryout on First Shift" };

/** One shell built ahead of time for npm run budget (src/config/performance.ts); every id loads the same scripts. */
export function generateStaticParams() {
  return [{ id: "tryout" }];
}

export default function OwnerTryoutPage() {
  return (
    <Band tone="paper">
      <OwnerTryout />
    </Band>
  );
}
