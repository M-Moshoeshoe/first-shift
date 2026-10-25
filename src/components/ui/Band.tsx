import type { ReactNode } from "react";

export type BandTone = "paper" | "mist";

export const BAND_TONES: Record<BandTone, string> = { paper: "bg-paper", mist: "bg-mist" };
export const BAND_TONES_LG: Record<BandTone, string> = { paper: "lg:bg-paper", mist: "lg:bg-mist" };

interface BandProps {
  tone: BandTone;
  /** The tone from 1024 px, where marketing rows merge and tones must still alternate. */
  lgTone?: BandTone;
  /** Marketing only: from 1024 px the column widens to 72 rem, aligned with the rows around it. */
  wide?: boolean;
  children: ReactNode;
}

/** A full-width tonal band holding the single 28 rem column (docs/DESIGN.md, Layout). */
export function Band({ tone, lgTone, wide = false, children }: BandProps) {
  return (
    <div className={`${BAND_TONES[tone]} ${lgTone ? BAND_TONES_LG[lgTone] : ""} px-5 py-8`}>
      <div className={`mx-auto flex max-w-md flex-col gap-6 ${wide ? "lg:max-w-6xl" : ""}`}>{children}</div>
    </div>
  );
}
