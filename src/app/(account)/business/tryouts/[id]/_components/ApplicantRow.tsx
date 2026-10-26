import { PersonPhoto } from "@/components/PersonPhoto";
import { OWNER_COPY } from "@/domain/bookingMessages";
import { FEED_COPY } from "@/domain/findingMessages";
import { formatRand } from "@/domain/money";
import type { ApplicantResponse } from "@/schemas/booking";

/**
 * One applicant as a compact row: their rank, face, first name, show-up
 * score, distance and fare, and up to two skills. Tapping it opens their
 * details and the offer in a sheet (ApplicantSheet), so a list of twenty
 * still reads at a glance.
 */
export function ApplicantRow({ applicant, rank, onOpen }: { applicant: ApplicantResponse; rank: number; onOpen: () => void }) {
  const fare = applicant.returnFareCents === null ? FEED_COPY.fareUnknown.toLowerCase() : `return taxi ${formatRand(applicant.returnFareCents)}`;
  const where = [applicant.distance ?? applicant.area, fare].join(", ");
  return (
    <button type="button" aria-haspopup="dialog" onClick={onOpen} className="lift flex min-h-16 w-full items-center gap-3 border border-line bg-paper p-3 text-left">
      <span aria-hidden="true" className="w-9 shrink-0 text-2xl font-bold tabular-nums">
        {String(rank).padStart(2, "0")}
      </span>
      <PersonPhoto subject={applicant.workerId} kind="profile" alt="" size="sm" />
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <span className="text-base font-semibold">{applicant.firstName}</span>
          {applicant.example ? <span className="border border-line px-1.5 text-micro text-muted">{OWNER_COPY.example}</span> : null}
        </span>
        <span className="text-sm text-muted tabular-nums">{where}</span>
        {applicant.skills.length > 0 ? <span className="text-sm">{applicant.skills.slice(0, 2).join(", ")}</span> : null}
      </span>
      <span className="flex shrink-0 flex-col items-center border border-ink px-2 py-1 tabular-nums">
        <span className="text-base font-bold">{applicant.showUp.score}</span>
        <span className="text-micro">{OWNER_COPY.showUpShort}</span>
      </span>
    </button>
  );
}
