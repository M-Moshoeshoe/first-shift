import type { ReactNode } from "react";
import { ProfileGate } from "@/components/ProfileGate";

/** A booking is open to its two parties once their profiles are finished (ProfileGate); the server shows each only their side. */
export default function BookingsLayout({ children }: { children: ReactNode }) {
  return <ProfileGate>{children}</ProfileGate>;
}
