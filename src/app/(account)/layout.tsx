import type { ReactNode } from "react";
import { AuthProvider } from "@/lib/auth/AuthProvider";

/** Every account screen shares the signed-in user. Marketing pages sit outside this group and never load it. */
export default function AccountLayout({ children }: { children: ReactNode }) {
  return <AuthProvider>{children}</AuthProvider>;
}
