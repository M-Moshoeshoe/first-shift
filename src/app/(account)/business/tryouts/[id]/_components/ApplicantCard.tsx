import { PersonPhoto } from "@/components/PersonPhoto";
import { Button } from "@/components/ui/Button";
import { OWNER_COPY } from "@/domain/bookingMessages";
import { FEED_COPY } from "@/domain/findingMessages";
import type { ApplicantResponse } from "@/schemas/booking";

interface ApplicantCardProps {
  applicant: ApplicantResponse;
  /** Whether an offer can be made now: no offer waiting, nobody booked, booking still open. */
  canOffer: boolean;
  busy: boolean;
  onOffer: () => void;
}

/** One applicant: who they are, how far they travel, their record, their note, and the one action. */
export function ApplicantCard({ applicant, canOffer, busy, onOffer }: ApplicantCardProps) {
  const where = [applicant.area, applicant.distance].filter(Boolean).join(", ");
  return (
    <article className="flex flex-col gap-4 border-2 border-ink p-4">
      <div className="flex gap-4">
        <PersonPhoto subject={applicant.workerId} kind="profile" alt={applicant.firstName} />
        <div className="flex flex-col gap-1">
          <h3 className="text-xl font-bold">{applicant.firstName}</h3>
          <p className="text-sm text-muted">{where}</p>
          <p className="text-sm text-muted tabular-nums">{applicant.returnFareCents === null ? FEED_COPY.fareUnknown : OWNER_COPY.returnFare(applicant.returnFareCents)}</p>
          <p className="text-sm text-muted tabular-nums">
            {OWNER_COPY.completed(applicant.completedTryouts)}. {OWNER_COPY.references(applicant.approvedReferences)}.
          </p>
        </div>
      </div>
      <div className="flex flex-col gap-1">
        <p className="font-bold tabular-nums">{OWNER_COPY.showUp(applicant.showUp.score)}</p>
        <ul className="flex list-disc flex-col gap-1 pl-5 text-sm">
          {applicant.showUp.reasons.map((reason) => (
            <li key={reason}>{reason}</li>
          ))}
        </ul>
        {applicant.firstTimerPlace ? <p className="text-sm">{OWNER_COPY.firstTimer}</p> : null}
      </div>
      {applicant.note ? (
        <div className="flex flex-col gap-1">
          <p className="text-sm font-bold">{OWNER_COPY.note}</p>
          <p className="text-lg">{applicant.note}</p>
        </div>
      ) : null}
      {canOffer ? (
        <Button variant="secondary" busy={busy} busyLabel="Offering" onClick={onOffer}>
          {OWNER_COPY.offer(applicant.firstName)}
        </Button>
      ) : null}
    </article>
  );
}
