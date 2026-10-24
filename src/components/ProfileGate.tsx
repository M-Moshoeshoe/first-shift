"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";
import { Band } from "@/components/ui/Band";
import { FormError } from "@/components/ui/FormError";
import { PageShell } from "@/components/ui/PageShell";
import { destinationFor, isDestination, redirectFor } from "@/domain/profile";
import { GatedProfileContext } from "@/lib/auth/gatedProfile";
import { useOwnProfile } from "@/lib/auth/useOwnProfile";
import { FormSkeleton } from "./FormSkeleton";
import { HomeSkeleton } from "./HomeSkeleton";

interface ProfileGateProps {
  /** Which placeholder to show while the profile loads: the shape of the screen it guards. */
  skeleton: "form" | "home";
  children: ReactNode;
}

/**
 * Guards the onboarding, work and business screens. Reads the person's own
 * profile from GET /api/profile (never Firestore in the browser) and lets
 * them stay only if this is where they belong (domain/profile.ts,
 * destinationFor and redirectFor); otherwise it sends them there. A skeleton
 * shows while it decides, never a blank screen or a spinner. If the profile
 * can't load, the screen stays closed and says why. Server routes enforce
 * everything again regardless.
 */
export function ProfileGate({ skeleton, children }: ProfileGateProps) {
  const pathname = usePathname();
  const router = useRouter();
  const profile = useOwnProfile(pathname);

  const target =
    profile.status === "signed_out"
      ? destinationFor(false, null, null)
      : profile.status === "ready"
        ? isDestination(pathname)
          ? redirectFor(pathname, profile.view.destination)
          : profile.view.destination
        : null;

  useEffect(() => {
    if (target) router.replace(target);
  }, [target, router]);

  if (profile.status === "ready" && !target) {
    return <GatedProfileContext.Provider value={profile.view}>{children}</GatedProfileContext.Provider>;
  }

  return (
    <PageShell>
      <Band tone="paper">
        {profile.status === "error" ? (
          <FormError message={profile.message} />
        ) : (
          <>
            <div aria-hidden="true" className="flex flex-col gap-4">
              <div className="h-10 w-3/4 animate-skeleton bg-mist" />
              <div className="h-7 animate-skeleton bg-mist" />
            </div>
            {skeleton === "form" ? <FormSkeleton /> : <HomeSkeleton />}
          </>
        )}
      </Band>
    </PageShell>
  );
}
