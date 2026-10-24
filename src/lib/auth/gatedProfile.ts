"use client";

import { createContext, useContext } from "react";
import type { ProfileViewResponse } from "@/schemas/profile";

/** The profile ProfileGate has already loaded and checked, for the screen it guards. */
export const GatedProfileContext = createContext<ProfileViewResponse | null>(null);

/** Only inside ProfileGate, which renders its children only once the profile has loaded and the person belongs here. */
export function useGatedProfile(): ProfileViewResponse {
  const view = useContext(GatedProfileContext);
  if (!view) throw new Error("useGatedProfile must be used inside ProfileGate (the onboarding, work and business layouts).");
  return view;
}
