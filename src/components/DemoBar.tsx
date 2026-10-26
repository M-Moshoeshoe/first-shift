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
    <section aria-label="Demo" className="bg-mist px-5 py-3">
      <div className="mx-auto flex max-w-md flex-col gap-3 lg:max-w-6xl">
        <p className="font-bold">{DEMO_COPY.banner}</p>
        {confirming ? (
          <>
            <p>{DEMO_COPY.resetConfirm}</p>
            <Button variant="stop" busy={busy} busyLabel={DEMO_COPY.resetBusy} aria-describedby={ERROR_ID} onClick={() => void reset()}>
              {DEMO_COPY.resetYes}
            </Button>
            <Button variant="secondary" onClick={() => setConfirming(false)}>
              {DEMO_COPY.resetNo}
            </Button>
            <FormError id={ERROR_ID} message={error} />
          </>
        ) : (
          <div>
            <Button variant="quiet" onClick={() => setConfirming(true)}>
              {DEMO_COPY.reset}
            </Button>
          </div>
        )}
      </div>
    </section>
  );
}
