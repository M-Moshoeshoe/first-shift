"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { FormError } from "@/components/ui/FormError";
import { BUTTON_LABELS } from "@/domain/messages";
import { useAuth } from "@/lib/auth/useAuth";
import { signInWithGoogle } from "@/lib/auth/signInWithGoogle";

const ERROR_ID = "sign-in-error";

/**
 * The one action on the sign-in screen. Until step 7 adds routing, a person
 * who is already signed in sees that, with a way to sign out.
 */
export function SignInPanel() {
  const { user, loading, error, signOut } = useAuth();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const handleSignIn = async () => {
    if (busy) return;
    setBusy(true);
    setMessage(null);
    const result = await signInWithGoogle();
    if (!result.ok) setMessage(result.error);
    setBusy(false);
  };

  const handleSignOut = () =>
    signOut().catch(() => setMessage("We couldn't sign you out. Check your connection, then tap Sign out again."));

  // A placeholder the exact height of the button, so nothing jumps when the answer arrives.
  if (loading) return <div role="status" aria-label="Checking whether you're signed in" className="h-13 animate-skeleton bg-mist" />;
  if (error) return <FormError message={error} />;

  if (user) {
    return (
      <div className="flex flex-col gap-4">
        <p className="text-lg">You&apos;re signed in{user.email ? ` as ${user.email}` : ""}.</p>
        <Button variant="secondary" onClick={() => void handleSignOut()} aria-describedby={ERROR_ID}>
          Sign out
        </Button>
        <FormError id={ERROR_ID} message={message} />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <Button busy={busy} busyLabel="Opening Google" onClick={() => void handleSignIn()} aria-describedby={ERROR_ID}>
        {BUTTON_LABELS.continueWithGoogle}
      </Button>
      <FormError id={ERROR_ID} message={message} />
    </div>
  );
}
