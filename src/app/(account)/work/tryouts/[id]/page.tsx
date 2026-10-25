import type { Metadata } from "next";
import { Band } from "@/components/ui/Band";
import { TryoutDetail } from "./_components/TryoutDetail";

export const metadata: Metadata = { title: "A paid tryout on First Shift" };

/**
 * The page is the same for every tryout: the client reads the id and asks
 * the server for the tryout. One shell is built ahead of time, so npm run
 * budget can measure it (src/config/performance.ts); any other id is drawn
 * on first request from the same code.
 */
export function generateStaticParams() {
  return [{ id: "tryout" }];
}

export default function TryoutPage() {
  return (
    <Band tone="paper">
      <TryoutDetail />
    </Band>
  );
}
