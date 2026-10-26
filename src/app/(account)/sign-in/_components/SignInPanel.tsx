"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { lazy, Suspense, useEffect, useState, type ComponentType } from "react";
import { ProfileErrorState } from "@/components/ProfileErrorState";
import { Button } from "@/components/ui/Button";
import { FormError } from "@/components/ui/FormError";
import { readIntent, withIntent } from "@/domain/intent";
import { BUTTON_LABELS } from "@/domain/buttonLabels";
import { PROFILE_MESSAGES } from "@/domain/messages";
import { redirectFor } from "@/domain/profile";
import { fail } from "@/domain/result";
import { useAuth } from "@/lib/auth/useAuth";
import { signInWithGoogle } from "@/lib/auth/signInWithGoogle";
import { testSignInAllowed } from "@/lib/emulators";
import { DemoChoice } from "./DemoChoice";

const ERROR_ID = "sign-in-error";

// Judges and testers only, so it loads when someone asks for it and the page stays light.
const DemoSignIn = lazy(() => import("./DemoSignIn").then((module) => ({ default: module.DemoSignIn })));

// Development builds only. In production this folds to null and the import is left out of the build.
const loadTestSignIn = process.env.NODE_ENV === "production" ? null : () => import("./TestSignIn");

/**
 * The one action on the sign-in screen. Someone already signed in, or who
 * has just signed in, goes straight to where they belong (domain/profile.ts),
 * carrying the home page's intent to the role screen (domain/intent.ts).
 */
export function SignInPanel() {
  const { user, loading, error } = useAuth();
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [profileError, setProfileError] = useState<{ uid: string; message: string } | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [TestSignIn, setTestSignIn] = useState<ComponentType | null>(null);
  const [showDemo, setShowDemo] = useState(false);

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
        if (target) router.replace(withIntent(target, readIntent(window.location.search)));
      });
    return () => {
      current = false;
    };
  }, [user, router, attempt]);

  const handleSignIn = async () => {
    if (busy) return;
    setBusy(true);
    setMessage(null);
    const result = await signInWithGoogle();
    if (!result.ok) setMessage(result.error);
    setBusy(false);
  };

  const retry = () => {
    setProfileError(null);
    setAttempt((count) => count + 1);
  };

  if (error) return <FormError message={error} />;
  // Signed in, but the profile didn't load: say why, and offer Try again and Sign out.
  if (user && profileError?.uid === user.uid) return <ProfileErrorState message={profileError.message} onRetry={retry} />;
  // A placeholder the exact height of the button while it works out who this is and where they go.
  if (loading || user) return <div role="status" aria-label="Checking whether you're signed in" className="h-13 animate-skeleton bg-mist" />;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3">
        <Button busy={busy} busyLabel="Opening Google" onClick={() => void handleSignIn()} aria-describedby={ERROR_ID}>
          {BUTTON_LABELS.continueWithGoogle}
        </Button>
        <FormError id={ERROR_ID} message={message} />
        <p className="text-sm text-muted">
          By continuing, you agree to the{" "}
          <Link href="/terms" className="underline">
            Terms
          </Link>{" "}
          and the{" "}
          <Link href="/privacy" className="underline">
            Privacy notice
          </Link>
          .
        </p>
      </div>
      <DemoChoice />
      {showDemo ? (
        <Suspense fallback={<div role="status" aria-label="Opening the demo sign-in" className="h-64 animate-skeleton bg-mist" />}>
          <DemoSignIn />
        </Suspense>
      ) : (
        <div>
          <Button variant="quiet" onClick={() => setShowDemo(true)}>
            Testers: sign in with a demo email
          </Button>
        </div>
      )}
      {TestSignIn ? <TestSignIn /> : null}
    </div>
  );
}
