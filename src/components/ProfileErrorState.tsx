"use client";

import { Button } from "@/components/ui/Button";
import { PageTitle } from "@/components/ui/PageTitle";
import { BUTTON_LABELS } from "@/domain/buttonLabels";
import { SignOutButton } from "./SignOutButton";

interface ProfileErrorStateProps {
  /** What went wrong and what to do, from the server or src/domain/messages.ts. */
  message: string;
  onRetry: () => void;
}

/**
 * When the person's profile can't load: say so, offer Try again first, and
 * Sign out as the way out. Never a dead end. Used by ProfileGate and the sign-in screen.
 */
export function ProfileErrorState({ message, onRetry }: ProfileErrorStateProps) {
  return (
    <>
      <div role="alert">
        <PageTitle title="We couldn't load your profile" intro={message} />
      </div>
      <div className="flex flex-col gap-3">
        <Button onClick={onRetry}>{BUTTON_LABELS.tryAgain}</Button>
        <SignOutButton />
      </div>
    </>
  );
}
