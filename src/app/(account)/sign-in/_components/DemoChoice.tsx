"use client";

import { useState } from "react";
import type { DemoRole } from "@/config/demo";
import { Button } from "@/components/ui/Button";
import { FormError } from "@/components/ui/FormError";
import { BUTTON_LABELS } from "@/domain/buttonLabels";

const ERROR_ID = "demo-choice-error";

/**
 * The judges' way in: one tap to either demo account, no password to type
 * (lib/auth/signInWithDemo.ts). The sign-in code loads only on tap, so the
 * page stays light. Once signed in, SignInPanel sends them on as for Google.
 */
export function DemoChoice() {
  const [busy, setBusy] = useState<DemoRole | null>(null);
  const [error, setError] = useState<string | null>(null);

  const choose = async (role: DemoRole) => {
    if (busy) return;
    setBusy(role);
    setError(null);
    const { tryDemo } = await import("@/lib/auth/signInWithDemo");
    const result = await tryDemo(role);
    if (!result.ok) {
      setError(result.error);
      setBusy(null);
    }
  };

  return (
    <section id="demo" aria-labelledby="demo-heading" className="flex flex-col gap-3">
      <h2 id="demo-heading" className="text-xl font-bold">
        Try the demo
      </h2>
      <p className="text-lg">Two demo accounts with made-up people and businesses. Nothing you do in them reaches real people.</p>
      <Button variant="secondary" busy={busy === "young_person"} busyLabel="Signing in" onClick={() => void choose("young_person")} aria-describedby={ERROR_ID}>
        {BUTTON_LABELS.tryAsThabo}
      </Button>
      <Button variant="secondary" busy={busy === "business"} busyLabel="Signing in" onClick={() => void choose("business")} aria-describedby={ERROR_ID}>
        {BUTTON_LABELS.tryAsSipho}
      </Button>
      <FormError id={ERROR_ID} message={error} />
    </section>
  );
}
