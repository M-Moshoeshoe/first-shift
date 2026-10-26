"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { Band } from "@/components/ui/Band";
import { NAV } from "@/config/nav";
import { readIntent, withIntent } from "@/domain/intent";
import { destinationFor, redirectFor } from "@/domain/profile";
import { GatedProfileContext } from "@/lib/auth/gatedProfile";
import { useOwnProfile } from "@/lib/auth/useOwnProfile";
import { setSignedInHint } from "@/lib/signedInHint";
import { AppShell } from "./AppShell";
import { NavProgress } from "./NavProgress";
import { ProfileErrorState } from "./ProfileErrorState";
import { ScreenSkeleton } from "./ScreenSkeleton";

/**
 * Guards the onboarding, work and business screens, inside the app shell.
 * Reads the person's own profile from GET /api/profile (never Firestore in
 * the browser) and lets them stay only if this is where they belong
 * (domain/profile.ts, destinationFor and redirectFor); otherwise it sends
 * them there, carrying the home page's intent (domain/intent.ts). A skeleton
 * the shape of the screen shows while it decides, never a blank screen or a
 * spinner. If the profile can't load, it says so and offers Try again and
 * Sign out. Server routes enforce everything again regardless.
 */
export function ProfileGate({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [attempt, setAttempt] = useState(0);
  // A new key reads the profile again: a new address (a step just changed it) or Try again.
  const profile = useOwnProfile(`${pathname}#${attempt}`);

  const target =
    profile.status === "signed_out"
      ? destinationFor(false, null, null)
      : profile.status === "ready"
        ? redirectFor(pathname, profile.view.destination)
        : null;

  // The public pages' "Open First Shift" (domain/signedInHint.ts): set once we know which home is theirs.
  const role = profile.status === "ready" && profile.view.complete ? profile.view.role : null;
  useEffect(() => {
    if (role) setSignedInHint(role === "business" ? "/business" : "/work");
  }, [role]);

  useEffect(() => {
    if (target) router.replace(withIntent(target, readIntent(window.location.search)));
  }, [target, router]);

  if (profile.status === "ready" && !target) {
    const nav = profile.view.complete && profile.view.role ? NAV[profile.view.role] : [];
    return (
      <GatedProfileContext.Provider value={profile.view}>
        <NavProgress />
        <AppShell nav={nav}>{children}</AppShell>
      </GatedProfileContext.Provider>
    );
  }

  return (
    <AppShell>
      <Band tone="paper">
        {profile.status === "error" ? (
          <ProfileErrorState message={profile.message} onRetry={() => setAttempt((count) => count + 1)} />
        ) : (
          <ScreenSkeleton path={pathname} />
        )}
      </Band>
    </AppShell>
  );
}
