import { SESSION_COVER_ID } from "@/lib/sessionCover";
import { BrandMark } from "./BrandMark";

/**
 * "Signing you in" or "Signing you out" over the whole screen, with the mark
 * and a progress bar (docs/DESIGN.md, Motion 17). Drawn by the server, hidden
 * until lib/sessionCover.ts sets data-session, and removed by ProfileGate once
 * the next screen has drawn (or by the sign-in screen after signing out).
 */
export function SessionCover() {
  return (
    <div id={SESSION_COVER_ID} role="status" aria-live="polite" className="group fixed inset-0 z-50 hidden flex-col items-center justify-center gap-5 bg-paper px-5 data-session:flex">
      <BrandMark height={56} />
      <div aria-hidden="true" className="h-1 w-48 overflow-hidden bg-mist">
        <div className="h-full origin-left bg-primary group-data-session:animate-session-bar" />
      </div>
      <p className="text-base font-semibold">
        <span className="hidden group-data-[session=in]:inline">Signing you in</span>
        <span className="hidden group-data-[session=out]:inline">Signing you out</span>
      </p>
    </div>
  );
}
