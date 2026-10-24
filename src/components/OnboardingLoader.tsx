"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";
import { FormError } from "@/components/ui/FormError";
import { PROFILE_MESSAGES } from "@/domain/messages";
import type { Role } from "@/domain/roles";
import { useOwnProfile } from "@/lib/auth/useOwnProfile";
import type { ProfileViewResponse } from "@/schemas/profile";
import { FormSkeleton } from "./FormSkeleton";

interface OnboardingLoaderProps {
  role: Role;
  /** Where a finished profile goes. */
  home: "/work" | "/business";
  render: (view: ProfileViewResponse) => ReactNode;
}

/**
 * Loads the person's own profile for an onboarding form: a skeleton while it
 * loads, a plain message when this isn't their form, straight home when the
 * profile is already finished. Until step 7 adds ProfileGate, this is where
 * those cases are handled.
 */
export function OnboardingLoader({ role, home, render }: OnboardingLoaderProps) {
  const profile = useOwnProfile();
  const router = useRouter();
  const finished = profile.status === "ready" && profile.view.complete && profile.view.role === role;

  useEffect(() => {
    if (finished) router.replace(home);
  }, [finished, home, router]);

  if (profile.status === "loading" || finished) return <FormSkeleton />;
  if (profile.status === "error") return <FormError message={profile.message} />;
  if (profile.status === "signed_out") {
    return (
      <p className="text-lg">
        Sign in to continue.{" "}
        <Link href="/sign-in" className="font-bold underline">
          Go to sign in
        </Link>
      </p>
    );
  }
  const { view } = profile;
  if (view.role !== role) return <FormError message={view.role ? PROFILE_MESSAGES.roleLocked[view.role] : PROFILE_MESSAGES.roleMissing} />;
  return render(view);
}
