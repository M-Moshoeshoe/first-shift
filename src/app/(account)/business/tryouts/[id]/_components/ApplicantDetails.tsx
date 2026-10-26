import { PersonPhoto } from "@/components/PersonPhoto";
import { OWNER_COPY } from "@/domain/bookingMessages";
import { FEED_COPY } from "@/domain/findingMessages";
import type { ApplicantResponse } from "@/schemas/booking";

/**
 * Everything the owner decides on, inside the applicant's sheet: their face,
 * intro, where they travel from and the fare, their record, what they can do,
 * the show-up insight with its reasons, and their note. Their name is the
 * sheet's heading.
 */
export function ApplicantDetails({ applicant }: { applicant: ApplicantResponse }) {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex gap-4">
        <PersonPhoto subject={applicant.workerId} kind="profile" alt={applicant.firstName} />
        <div className="flex flex-col gap-1">
          {applicant.intro ? <p className="text-base">{applicant.intro}</p> : null}
          <p className="text-sm text-muted">{[applicant.area, applicant.distance].filter(Boolean).join(", ")}</p>
          <p className="text-sm text-muted tabular-nums">{applicant.returnFareCents === null ? FEED_COPY.fareUnknown : OWNER_COPY.returnFare(applicant.returnFareCents)}</p>
          <p className="text-sm text-muted tabular-nums">
            {OWNER_COPY.completed(applicant.completedTryouts)}. {OWNER_COPY.references(applicant.approvedReferences)}.
          </p>
        </div>
      </div>
      {/* The insight: a score from their own record with every reason shown (domain/showUp.ts). Rules, not AI, so no AI mark. */}
      <section aria-labelledby="show-up-heading" className="flex flex-col gap-2 bg-mist p-4">
        <h3 id="show-up-heading" className="flex items-baseline justify-between gap-3 text-base font-bold">
          {OWNER_COPY.showUpTitle}
          <span className="text-xl tabular-nums">{OWNER_COPY.showUpScore(applicant.showUp.score)}</span>
        </h3>
        <ul className="flex list-disc flex-col gap-1 pl-5 text-sm">
          {applicant.showUp.reasons.map((reason) => (
            <li key={reason}>{reason}</li>
          ))}
        </ul>
        <p className="text-micro text-muted">{OWNER_COPY.showUpReasons}</p>
        {applicant.firstTimerPlace ? <p className="text-sm">{OWNER_COPY.firstTimer}</p> : null}
      </section>
      {applicant.skills.length > 0 || applicant.languages.length > 0 ? (
        <div className="flex flex-col gap-1 text-sm">
          {applicant.canDoThisWork ? <p className="font-semibold">{OWNER_COPY.canDo}</p> : null}
          <dl className="flex flex-col gap-1">
            {applicant.skills.length > 0 ? (
              <div className="flex flex-wrap gap-x-2">
                <dt className="text-muted">{OWNER_COPY.skills}:</dt>
                <dd>{applicant.skills.join(", ")}</dd>
              </div>
            ) : null}
            {applicant.languages.length > 0 ? (
              <div className="flex flex-wrap gap-x-2">
                <dt className="text-muted">{OWNER_COPY.languages}:</dt>
                <dd>{applicant.languages.join(", ")}</dd>
              </div>
            ) : null}
          </dl>
        </div>
      ) : null}
      {applicant.note ? (
        <div className="flex flex-col gap-1">
          <p className="text-sm font-semibold">{OWNER_COPY.note}</p>
          <p className="text-base">{applicant.note}</p>
        </div>
      ) : null}
    </div>
  );
}
