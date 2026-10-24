"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { FormError } from "@/components/ui/FormError";
import { BUTTON_LABELS, PROFILE_MESSAGES } from "@/domain/messages";
import { useAuth } from "@/lib/auth/useAuth";

const ERROR_ID = "sign-out-error";

/** Signs out and goes to /sign-in. A failure says so; it never looks like it worked. */
export function SignOutButton() {
  const { signOut } = useAuth();
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSignOut = async () => {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      await signOut();
      router.replace("/sign-in");
    } catch {
      setError(PROFILE_MESSAGES.signOutFailed);
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-col gap-2">
      <Button variant="secondary" busy={busy} busyLabel="Signing out" aria-describedby={ERROR_ID} onClick={() => void handleSignOut()}>
        {BUTTON_LABELS.signOut}
      </Button>
      <FormError id={ERROR_ID} message={error} />
    </div>
  );
}
