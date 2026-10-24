"use client";

import { useState } from "react";
import { StepProgress } from "@/components/ui/StepProgress";
import type { ProfileViewResponse } from "@/schemas/profile";
import { DetailsStep, type DetailsDraft } from "./DetailsStep";
import { IdStep } from "./IdStep";
import { PhotoStep } from "./PhotoStep";
import { ProfileDone } from "@/components/ProfileDone";

type Step = 1 | 2 | 3;

/**
 * Three steps: about you, ID number, photo. Details and ID are saved together
 * at the end of step 2, so if the photo fails, coming back opens step 3 with
 * the saved details shown and only the photo left to do.
 */
export function WorkFlow({ view }: { view: ProfileViewResponse }) {
  const saved = view.worker;
  const detailsSaved = Boolean(saved?.firstName && saved.idLastFour);
  const [step, setStep] = useState<Step>(detailsSaved ? 3 : 1);
  const [moved, setMoved] = useState(false);
  const [finished, setFinished] = useState(false);
  const [idLastFour, setIdLastFour] = useState(saved?.idLastFour ?? "");
  const [details, setDetails] = useState<DetailsDraft>({
    firstName: saved?.firstName ?? "",
    area: saved?.area ?? "",
    availability: saved?.availability ?? [],
    payoutPhone: saved?.payoutPhone ?? "",
  });

  const go = (next: Step) => {
    setMoved(true);
    setStep(next);
  };

  return (
    <div className="flex flex-col gap-6">
      <StepProgress current={step} done={finished ? 3 : step - 1} total={3} />
      {finished ? (
        <ProfileDone next="/work" />
      ) : step === 1 ? (
        <DetailsStep
          initial={details}
          focusHeading={moved}
          onNext={(draft) => {
            setDetails(draft);
            go(2);
          }}
        />
      ) : step === 2 ? (
        <IdStep
          details={details}
          onBack={() => go(1)}
          onSaved={(lastFour) => {
            setIdLastFour(lastFour);
            go(3);
          }}
        />
      ) : (
        <PhotoStep details={details} idLastFour={idLastFour} focusHeading={moved} onDone={() => setFinished(true)} />
      )}
    </div>
  );
}
