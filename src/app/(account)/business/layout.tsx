import type { ReactNode } from "react";
import { ProfileGate } from "@/components/ProfileGate";

/** /business is open only to an owner whose profile is finished (ProfileGate). */
export default function BusinessLayout({ children }: { children: ReactNode }) {
  return <ProfileGate skeleton="home">{children}</ProfileGate>;
}
