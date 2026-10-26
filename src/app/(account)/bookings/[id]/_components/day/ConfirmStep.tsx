"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { FormError } from "@/components/ui/FormError";
import { useStep } from "@/lib/useStep";

interface ConfirmStepProps {
  path: string;
  label: string;
  explain: string;
  yes: string;
  fallback: string;
  done: () => void;
}

/** A step that can't be undone, in two taps: the first says what it means, the second does it. */
export function ConfirmStep({ path, label, explain, yes, fallback, done }: ConfirmStepProps) {
  const [asking, setAsking] = useState(false);
  const step = useStep(path, fallback, done);
  if (!asking) {
    return (
      <Button variant="stop" onClick={() => setAsking(true)}>
        {label}
      </Button>
    );
  }
  return (
    <div className="flex flex-col gap-3">
      <p className="text-base">{explain}</p>
      <Button variant="stop" busy={step.busy} busyLabel="Sending" onClick={() => void step.send()}>
        {yes}
      </Button>
      <Button variant="secondary" onClick={() => setAsking(false)}>
        Go back
      </Button>
      <FormError message={step.error} />
    </div>
  );
}
