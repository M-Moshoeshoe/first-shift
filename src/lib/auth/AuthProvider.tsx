"use client";

import { onAuthStateChanged, signOut as firebaseSignOut, type User } from "firebase/auth";
import { createContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { clientAuth, firebaseConfigured } from "@/lib/firebaseClient";

export interface AuthState {
  user: User | null;
  /** True until Firebase has said whether someone is signed in. */
  loading: boolean;
  /** Set when sign-in can't work at all, for example missing Firebase settings. */
  error: string | null;
  signOut: () => Promise<void>;
}

export const AuthContext = createContext<AuthState | null>(null);

const signOut = () => firebaseSignOut(clientAuth());

const NOT_CONFIGURED = "Sign-in isn't set up on this copy of First Shift yet. Add the Firebase settings (see README), then reload.";

/** Holds the signed-in user for every account screen. Marketing pages never load it. */
export function AuthProvider({ children }: { children: ReactNode }) {
  // Missing settings are known at build time, so they fail closed before any subscription.
  const configured = firebaseConfigured();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(configured);

  useEffect(() => {
    if (!configured) return undefined;
    return onAuthStateChanged(clientAuth(), (next) => {
      setUser(next);
      setLoading(false);
    });
  }, [configured]);

  const error = configured ? null : NOT_CONFIGURED;
  const value = useMemo(() => ({ user, loading, error, signOut }), [user, loading, error]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
