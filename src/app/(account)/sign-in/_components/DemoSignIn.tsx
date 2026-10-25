"use client";

import { useEffect, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/Button";
import { FormError } from "@/components/ui/FormError";
import { TextField } from "@/components/ui/TextField";
import { BUTTON_LABELS } from "@/domain/buttonLabels";
import { signInWithDemo } from "@/lib/auth/signInWithDemo";

const ERROR_ID = "demo-sign-in-error";

/**
 * Judges and testers sign in to a demo account with an email and password
 * from the team. Loaded only when someone asks for it, so the sign-in page
 * stays light. Once signed in, SignInPanel sends them on as it does for Google.
 */
export function DemoSignIn() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    document.getElementById("demo-email")?.focus();
  }, []);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setError(null);
    const result = await signInWithDemo(email, password);
    if (!result.ok) {
      setError(result.error);
      setBusy(false);
    }
  };

  return (
    <form noValidate onSubmit={(event) => void handleSubmit(event)} aria-label="Demo account" className="flex flex-col gap-4 border-2 border-edge p-4">
      <TextField id="demo-email" label="Email" type="email" inputMode="email" autoComplete="username" value={email} onChange={(event) => setEmail(event.target.value)} />
      <TextField id="demo-password" label="Password" type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} />
      <div className="flex flex-col gap-3">
        <Button type="submit" variant="secondary" busy={busy} busyLabel="Signing in" aria-describedby={ERROR_ID}>
          {BUTTON_LABELS.signInToDemo}
        </Button>
        <FormError id={ERROR_ID} message={error} />
      </div>
    </form>
  );
}
