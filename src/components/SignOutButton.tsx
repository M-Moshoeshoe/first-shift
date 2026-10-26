"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { FormError } from "@/components/ui/FormError";
import { BUTTON_LABELS } from "@/domain/buttonLabels";
import { PROFILE_MESSAGES } from "@/domain/messages";
import { useAuth } from "@/lib/auth/useAuth";
import { hideSessionCover, showSessionCover } from "@/lib/sessionCover";

interface SignOutButtonProps {
  /** "header": a quiet text action in the app header; "block": a full-width secondary button. */
  variant?: "header" | "block";
}

/** Signs out and goes to /sign-in, behind the "Signing you out" cover. A failure says so; it never looks like it worked. */
export function SignOutButton({ variant = "block" }: SignOutButtonProps) {
  const { signOut } = useAuth();
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const errorId = `sign-out-error-${variant}`;

  const handleSignOut = async () => {
    if (busy) return;
    setBusy(true);
    setError(null);
    // Covered from the tap until the sign-in screen has drawn (SignInPanel clears it), so no screen flashes on the way.
    showSessionCover("out");
    try {
      await signOut();
      router.replace("/sign-in");
    } catch {
      hideSessionCover("out");
      setError(PROFILE_MESSAGES.signOutFailed);
      setBusy(false);
    }
  };

  return (
    <div className={variant === "header" ? "flex flex-col items-end" : "flex flex-col gap-3"}>
      <Button variant={variant === "header" ? "quiet" : "secondary"} busy={busy} busyLabel="Signing out" aria-describedby={errorId} onClick={() => void handleSignOut()}>
        {BUTTON_LABELS.signOut}
      </Button>
      <FormError id={errorId} message={error} />
    </div>
  );
}
