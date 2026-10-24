"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, type ComponentType } from "react";
import { SignOutButton } from "@/components/SignOutButton";
import { Button } from "@/components/ui/Button";
import { FormError } from "@/components/ui/FormError";
import { BUTTON_LABELS, PROFILE_MESSAGES } from "@/domain/messages";
import { redirectFor } from "@/domain/profile";
import { fail } from "@/domain/result";
import { useAuth } from "@/lib/auth/useAuth";
import { signInWithGoogle } from "@/lib/auth/signInWithGoogle";
import { testSignInAllowed } from "@/lib/emulators";

const ERROR_ID = "sign-in-error";

// Development builds only. In production this folds to null and the import is left out of the build.
const loadTestSignIn = process.env.NODE_ENV === "production" ? null : () => import("./TestSignIn");

/**
 * The one action on the sign-in screen. Someone already signed in, or who
 * has just signed in, goes straight to where they belong (domain/profile.ts).
 */
export function SignInPanel() {
  const { user, loading, error } = useAuth();
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [profileError, setProfileError] = useState<{ uid: string; message: string } | null>(null);
  const [TestSignIn, setTestSignIn] = useState<ComponentType | null>(null);

  useEffect(() => {
    if (!loadTestSignIn || !testSignInAllowed(process.env.NODE_ENV, process.env.NEXT_PUBLIC_USE_EMULATORS, window.location.hostname)) return;
    void loadTestSignIn().then((module) => setTestSignIn(() => module.TestSignIn));
  }, []);

  useEffect(() => {
    if (!user) return undefined;
    let current = true;
    // Loaded only now: signed-out visitors never download the profile code.
    import("@/lib/auth/fetchDestination")
      .then(({ fetchDestination }) => fetchDestination())
      .catch(() => fail(PROFILE_MESSAGES.profileUnavailable)) // the code itself didn't download
      .then((result) => {
        if (!current) return;
        if (!result.ok) return setProfileError({ uid: user.uid, message: result.error });
        const target = redirectFor("/sign-in", result.value);
        if (target) router.replace(target);
      });
    return () => {
      current = false;
    };
  }, [user, router]);

  const handleSignIn = async () => {
    if (busy) return;
    setBusy(true);
    setMessage(null);
    const result = await signInWithGoogle();
    if (!result.ok) setMessage(result.error);
    setBusy(false);
  };

  if (error) return <FormError message={error} />;
  if (user && profileError?.uid === user.uid) {
    // Signed in, but the profile didn't load: say why, and offer a way out.
    return (
      <div className="flex flex-col gap-4">
        <FormError message={profileError.message} />
        <SignOutButton />
      </div>
    );
  }
  // A placeholder the exact height of the button while it works out who this is and where they go.
  if (loading || user) return <div role="status" aria-label="Checking whether you're signed in" className="h-13 animate-skeleton bg-mist" />;

  return (
    <div className="flex flex-col gap-2">
      <Button busy={busy} busyLabel="Opening Google" onClick={() => void handleSignIn()} aria-describedby={ERROR_ID}>
        {BUTTON_LABELS.continueWithGoogle}
      </Button>
      <FormError id={ERROR_ID} message={message} />
      {TestSignIn ? <TestSignIn /> : null}
    </div>
  );
}
