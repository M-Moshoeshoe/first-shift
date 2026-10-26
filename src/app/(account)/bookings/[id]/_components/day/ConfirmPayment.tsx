"use client";

import { Button } from "@/components/ui/Button";
import { FormError } from "@/components/ui/FormError";
import { DAY_COPY } from "@/domain/dayMessages";
import { useStep } from "@/lib/useStep";
import { BOOKING_NOT_FOUND } from "@/domain/bookingMessages";


/** The young person, having checked their real balance (BalanceCheck), says whether it arrived. */
export function ConfirmPayment({ bookingId, done }: { bookingId: string; done: () => void }) {
  const step = useStep(`/api/bookings/${encodeURIComponent(bookingId)}/confirm`, BOOKING_NOT_FOUND, done);
  return (
    <div className="flex flex-col gap-3">
      <Button busy={step.busy} busyLabel="Saving" onClick={() => void step.send({ received: true })}>
        {DAY_COPY.received}
      </Button>
      <Button variant="stop" busy={step.busy} busyLabel="Saving" onClick={() => void step.send({ received: false })}>
        {DAY_COPY.notReceived}
      </Button>
      <FormError message={step.error} />
    </div>
  );
}
