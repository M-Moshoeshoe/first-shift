"use client";

import { GoogleAuthProvider, signInWithCredential } from "firebase/auth";
import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/Button";
import { FormError } from "@/components/ui/FormError";
import { TextField } from "@/components/ui/TextField";
import { TEST_SIGN_IN_MARKER } from "@/config/testSignIn";
import { clientAuth } from "@/lib/firebaseClient";

/**
 * Development only, against the Auth emulator: signs in as a made-up Google
 * account so every routing path can be walked without a real one. Loaded by
 * SignInPanel only when testSignInAllowed() is true; never in a production build.
 */
export function TestSignIn() {
  const [name, setName] = useState("thabo");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const sub = name.trim().toLowerCase().replace(/[^a-z0-9-]/g, "");
    if (!sub) return setError("Type a test account name, for example thabo.");
    setBusy(true);
    setError(null);
    try {
      // The Auth emulator accepts an unsigned Google credential (scripts/e2e/session.ts does the same).
      const credential = GoogleAuthProvider.credential(JSON.stringify({ sub, email: `${sub}@example.com`, email_verified: true }));
      await signInWithCredential(clientAuth(), credential);
    } catch {
      setError("The test sign-in failed. Check that the emulators are running with npm run emulators.");
    }
    setBusy(false);
  };

  return (
    <form data-marker={TEST_SIGN_IN_MARKER} onSubmit={(event) => void handleSubmit(event)} className="flex flex-col gap-4 border border-edge p-4">
      <TextField id="test-account" label="Test account (emulators only)" value={name} onChange={(event) => setName(event.target.value)} autoComplete="off" />
      <Button type="submit" variant="secondary" busy={busy} busyLabel="Signing in">
        Sign in as test account
      </Button>
      <FormError message={error} />
    </form>
  );
}
