import type { Metadata } from "next";
import { Band } from "@/components/ui/Band";
import { BookingDetail } from "./_components/BookingDetail";

export const metadata: Metadata = { title: "Your booking on First Shift" };

/** One shell built ahead of time for npm run budget (src/config/performance.ts); every id loads the same scripts. */
export function generateStaticParams() {
  return [{ id: "booking" }];
}

export default function BookingPage() {
  return (
    <Band tone="paper">
      <BookingDetail />
    </Band>
  );
}
