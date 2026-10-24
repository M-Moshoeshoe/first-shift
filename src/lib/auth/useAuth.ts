"use client";

import { useContext } from "react";
import { AuthContext, type AuthState } from "./AuthProvider";

/** The signed-in user, whether that's still loading, and signOut. Only inside the (account) screens. */
export function useAuth(): AuthState {
  const state = useContext(AuthContext);
  if (!state) throw new Error("useAuth must be used inside AuthProvider, which wraps the (account) screens.");
  return state;
}
