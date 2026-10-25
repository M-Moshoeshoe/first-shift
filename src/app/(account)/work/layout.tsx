import type { ReactNode } from "react";
import { ProfileGate } from "@/components/ProfileGate";

/** /work is open only to a young person whose profile is finished (ProfileGate). */
export default function WorkLayout({ children }: { children: ReactNode }) {
  return <ProfileGate>{children}</ProfileGate>;
}
