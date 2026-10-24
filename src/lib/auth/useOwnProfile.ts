"use client";

import { useEffect, useState } from "react";
import { PROFILE_MESSAGES } from "@/domain/messages";
import { ProfileViewSchema, type ProfileViewResponse } from "@/schemas/profile";
import { ApiError, apiGet } from "@/lib/api";
import { useAuth } from "./useAuth";

export type OwnProfile =
  | { status: "loading" }
  | { status: "signed_out" }
  | { status: "error"; message: string }
  | { status: "ready"; view: ProfileViewResponse };

/**
 * The signed-in person's own profile from GET /api/profile, read on the
 * server so account screens never load Firestore. Onboarding fills forms back
 * in from it; ProfileGate (step 7) routes with it.
 */
export function useOwnProfile(): OwnProfile {
  const { user, loading, error } = useAuth();
  const [loaded, setLoaded] = useState<{ uid: string; profile: OwnProfile } | null>(null);

  useEffect(() => {
    if (!user) return undefined;
    let current = true;
    apiGet("/api/profile", ProfileViewSchema).then(
      (view) => current && setLoaded({ uid: user.uid, profile: { status: "ready", view } }),
      (caught: unknown) => {
        const message = caught instanceof ApiError ? caught.message : PROFILE_MESSAGES.profileUnavailable;
        if (current) setLoaded({ uid: user.uid, profile: { status: "error", message } });
      },
    );
    return () => {
      current = false;
    };
  }, [user]);

  if (error) return { status: "error", message: error };
  if (loading) return { status: "loading" };
  if (!user) return { status: "signed_out" };
  return loaded?.uid === user.uid ? loaded.profile : { status: "loading" };
}
