"use client";

import { SavedSummary } from "@/components/SavedSummary";
import { PageTitle } from "@/components/ui/PageTitle";
import { useGatedProfile } from "@/lib/auth/gatedProfile";
import { useHeadingFocus } from "@/lib/useHeadingFocus";
import { WorkerEditForm } from "./WorkerEditForm";

/** The young person's own profile: what onboarding saved, and what they can change: how businesses pay them and what they can do. */
export function WorkerProfile() {
  const view = useGatedProfile();
  const heading = useHeadingFocus(true);
  const worker = view.worker;
  const rows = [
    { term: "First name", value: worker?.firstName ?? "" },
    { term: "Area", value: worker?.area ?? "" },
    { term: "Cellphone for payments", value: worker?.payoutPhone ?? "" },
    { term: "ID number", value: worker?.idLastFour ? `Ending in ${worker.idLastFour}` : "" },
  ];
  return (
    <>
      <PageTitle headingRef={heading} title="Your profile" intro="What businesses see when you apply, and how they can pay you." />
      <SavedSummary id="profile-saved" rows={rows} />
      <WorkerEditForm
        initial={{ payMethods: worker?.payMethods ?? [], about: { skills: worker?.skills ?? [], languages: worker?.languages ?? [], intro: worker?.intro ?? "" } }}
        askSurname={!worker?.hasSurname}
      />
    </>
  );
}
