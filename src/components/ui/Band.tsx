import type { ReactNode } from "react";

interface BandProps {
  tone: "paper" | "mist";
  children: ReactNode;
}

const tones: Record<BandProps["tone"], string> = { paper: "bg-paper", mist: "bg-mist" };

/** A full-width tonal band holding the single 28 rem column (docs/DESIGN.md, Layout). */
export function Band({ tone, children }: BandProps) {
  return (
    <div className={`${tones[tone]} px-5 py-8`}>
      <div className="mx-auto flex max-w-md flex-col gap-6">{children}</div>
    </div>
  );
}
