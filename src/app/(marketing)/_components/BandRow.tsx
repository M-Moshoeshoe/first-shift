import type { ReactNode } from "react";
import { BAND_TONES, BAND_TONES_LG, type BandTone } from "@/components/ui/Band";

interface BandRowProps {
  /** Each cell is its own full-width band on phones, in its own tone. */
  cells: readonly { key: string; tone: BandTone; content: ReactNode }[];
  /** From 1024 px the cells sit side by side in one band of this tone, max 72 rem wide. */
  lgTone: BandTone;
  columns: 2 | 3;
  /** "center" for the hero (copy beside the slip); "start" so a row of headings lines up. */
  align: "center" | "start";
}

const COLUMNS: Record<BandRowProps["columns"], string> = { 2: "lg:grid-cols-2", 3: "lg:grid-cols-3" };
const ALIGN: Record<BandRowProps["align"], string> = { center: "lg:items-center", start: "lg:items-start" };

/**
 * Stacked bands on a phone, one row of columns on a desktop (docs/DESIGN.md,
 * Layout). The gutter sits outside the 72 rem box, as in Band, so every row's
 * left edge lines up with the header and the bands around it.
 */
export function BandRow({ cells, lgTone, columns, align }: BandRowProps) {
  return (
    <div className={`${BAND_TONES_LG[lgTone]} lg:px-5 lg:py-8`}>
      <div className={`lg:mx-auto lg:grid lg:max-w-6xl lg:gap-12 ${COLUMNS[columns]} ${ALIGN[align]}`}>
        {cells.map((cell) => (
          <div key={cell.key} className={`${BAND_TONES[cell.tone]} px-5 py-8 lg:bg-transparent lg:p-0`}>
            <div className="mx-auto flex max-w-md flex-col gap-6 lg:mx-0">{cell.content}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
