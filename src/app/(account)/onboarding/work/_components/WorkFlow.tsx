"use client";

import { useState } from "react";
import { StepProgress } from "@/components/ui/StepProgress";
import type { ProfileViewResponse } from "@/schemas/profile";
import type { AboutDraft } from "@/components/AboutFields";
import { AboutStep } from "./AboutStep";
import { DetailsStep, type DetailsDraft } from "./DetailsStep";
import { IdStep } from "./IdStep";
import { PhotoStep } from "./PhotoStep";
import { ProfileDone } from "@/components/ProfileDone";

type Step = 1 | 2 | 3 | 4;
const STEPS = 4;

/**
 * Four steps: about you, what you can do, surname and ID number, photo.
 * Everything is saved together at the end of step 3, so if the photo fails,
 * coming back opens step 4 with the saved details shown and only the photo left.
 */
export function WorkFlow({ view }: { view: ProfileViewResponse }) {
  const saved = view.worker;
  const detailsSaved = Boolean(saved?.firstName && saved.idLastFour);
  const [step, setStep] = useState<Step>(detailsSaved ? 4 : 1);
  const [moved, setMoved] = useState(false);
  const [finished, setFinished] = useState(false);
  const [idLastFour, setIdLastFour] = useState(saved?.idLastFour ?? "");
  const [details, setDetails] = useState<DetailsDraft>({
    firstName: saved?.firstName ?? "",
    area: saved?.area ?? "",
    availability: saved?.availability ?? [],
    payoutPhone: saved?.payoutPhone ?? "",
    payMethods: saved?.payMethods ?? [],
  });
  const [surname, setSurname] = useState("");
  const [about, setAbout] = useState<AboutDraft>({ skills: saved?.skills ?? [], languages: saved?.languages ?? [], intro: saved?.intro ?? "" });

  const go = (next: Step) => {
    setMoved(true);
    setStep(next);
  };

  return (
    <div className="flex flex-col gap-6">
      <StepProgress current={step} done={finished ? STEPS : step - 1} total={STEPS} />
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
        <AboutStep
          initial={about}
          onBack={() => go(1)}
          onNext={(draft) => {
            setAbout(draft);
            go(3);
          }}
        />
      ) : step === 3 ? (
        <IdStep
          details={details}
          about={about}
          surname={surname}
          onSurname={setSurname}
          onBack={() => go(2)}
          onSaved={(lastFour) => {
            setIdLastFour(lastFour);
            go(4);
          }}
        />
      ) : (
        <PhotoStep details={details} about={about} idLastFour={idLastFour} focusHeading={moved} onDone={() => setFinished(true)} onBack={() => go(3)} />
      )}
    </div>
  );
}
