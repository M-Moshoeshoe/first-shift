import type { ReactNode } from "react";
import { ShiftSlip } from "@/components/ShiftSlip";
import { sastSlot } from "@/domain/time";
import type { FeedItemResponse } from "@/schemas/finding";

/** A tryout from the feed drawn as a slip: time, pay, business, area and distance, fare, injury cover, and "New on First Shift". */
export function FeedSlip({ item, footer }: { item: FeedItemResponse; footer?: ReactNode }) {
  const { day, hours } = sastSlot(new Date(item.startAt), new Date(item.endAt));
  return (
    <ShiftSlip
      day={day}
      hours={hours}
      business={item.businessName}
      area={item.area}
      distance={item.distance}
      payCents={item.payCents}
      returnFareCents={item.returnFareCents}
      notes={[item.injuryCover]}
      isNew={item.isNew}
      footer={footer}
    />
  );
}
