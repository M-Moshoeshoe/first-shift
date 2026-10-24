"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { FormError } from "@/components/ui/FormError";
import { PROFILE_MESSAGES } from "@/domain/messages";
import { useOwnProfile } from "@/lib/auth/useOwnProfile";
import { FormSkeleton } from "./FormSkeleton";
import { WorkFlow } from "./WorkFlow";

/**
 * Loads the person's own profile, then hands over to the form. Until step 7
 * adds ProfileGate, the cases where this isn't the right screen are handled
 * here with a plain message; a finished profile goes straight to /work.
 */
export function WorkOnboarding() {
  const profile = useOwnProfile();
  const router = useRouter();
  const finished = profile.status === "ready" && profile.view.complete;

  useEffect(() => {
    if (finished) router.replace("/work");
  }, [finished, router]);

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
  if (view.role !== "young_person") return <FormError message={view.role ? PROFILE_MESSAGES.roleLocked[view.role] : PROFILE_MESSAGES.roleMissing} />;
  return <WorkFlow view={view} />;
}
