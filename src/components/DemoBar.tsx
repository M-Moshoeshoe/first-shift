"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { FormError } from "@/components/ui/FormError";
import { DEMO_COPY } from "@/domain/demoCopy";

const ERROR_ID = "demo-reset-error";

/**
 * On every screen while a demo account is signed in (AppShell loads it only then): says it's the demo, and
 * offers "Reset the demo", in two taps because it resets the world every
 * judge shares. Afterwards sign-in sends the person to their start screen.
 */
export function DemoBar() {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const reset = async () => {
    setBusy(true);
    setError(null);
    const { resetDemo } = await import("@/lib/demoReset");
    const result = await resetDemo();
    if (result.ok) return router.replace("/sign-in");
    setError(result.error);
    setBusy(false);
  };

  return (
    <section aria-label="Demo" className="border-b border-line bg-mist px-5 py-2">
      <div className="mx-auto flex max-w-md flex-col gap-2 lg:px-5">
        <div className="flex flex-wrap items-center justify-between gap-x-3">
          <p className="flex items-center gap-2 text-sm">
            <span className="border border-ink px-1.5 text-micro font-semibold">Demo</span>
            {DEMO_COPY.banner}
          </p>
          {confirming ? null : (
            <Button variant="quiet" onClick={() => setConfirming(true)}>
              {DEMO_COPY.reset}
            </Button>
          )}
        </div>
        {confirming ? (
          <div className="flex flex-col gap-3 pb-2">
            <p className="text-sm">{DEMO_COPY.resetConfirm}</p>
            <Button variant="stop" busy={busy} busyLabel={DEMO_COPY.resetBusy} aria-describedby={ERROR_ID} onClick={() => void reset()}>
              {DEMO_COPY.resetYes}
            </Button>
            <Button variant="secondary" onClick={() => setConfirming(false)}>
              {DEMO_COPY.resetNo}
            </Button>
            <FormError id={ERROR_ID} message={error} />
          </div>
        ) : null}
      </div>
    </section>
  );
}
