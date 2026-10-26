import type { ReactNode } from "react";
import { NavProgress } from "@/components/NavProgress";
import { SessionCover } from "@/components/SessionCover";
import { AuthProvider } from "@/lib/auth/AuthProvider";

/**
 * Every account screen shares the signed-in user. Marketing pages sit outside this group and never load it.
 * The session cover lives here, not in a screen, so it stays up while signing in or out moves to the next screen;
 * so does the navigation bar, so a tap on sign-in or onboarding shows it too.
 */
export default function AccountLayout({ children }: { children: ReactNode }) {
  return (
    <AuthProvider>
      <NavProgress />
      {children}
      <SessionCover />
    </AuthProvider>
  );
}
