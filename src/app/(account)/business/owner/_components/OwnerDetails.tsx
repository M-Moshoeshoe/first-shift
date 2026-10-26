"use client";

import Link from "next/link";
import { useState } from "react";
import { OwnerDetailsForm, type OwnerDraft } from "@/components/OwnerDetailsForm";
import { OwnerPhotoStep } from "@/components/OwnerPhotoStep";
import { buttonClass } from "@/components/ui/Button";
import { PageTitle } from "@/components/ui/PageTitle";
import { OWNER_FORM_COPY } from "@/domain/profileCopy";
import { useGatedProfile } from "@/lib/auth/gatedProfile";

/**
 * The owner's details, for a business that signed up before they were asked
 * (or to change them): full name, ID, cellphone and CIPC number, then a
 * photo of their face. Posting opens again once both are saved.
 */
export function OwnerDetails() {
  const owner = useGatedProfile().business?.owner;
  const [draft, setDraft] = useState<OwnerDraft>({ legalName: owner?.legalName ?? "", phone: owner?.phone ?? "", cipc: owner?.cipc ?? "" });
  const [step, setStep] = useState<"details" | "photo" | "done">("details");
  return (
    <>
      <PageTitle title={OWNER_FORM_COPY.pageTitle} intro={OWNER_FORM_COPY.pageIntro} />
      {step === "details" ? (
        <OwnerDetailsForm
          initial={draft}
          onSaved={(saved) => {
            setDraft(saved);
            setStep("photo");
          }}
        />
      ) : null}
      {step === "photo" ? <OwnerPhotoStep owner={draft} onBack={() => setStep("details")} onSaved={() => setStep("done")} /> : null}
      {step === "done" ? (
        <div className="flex flex-col gap-3">
          <p role="status" className="text-lg font-bold text-go">
            {OWNER_FORM_COPY.saved}
          </p>
          <Link href="/business" className={buttonClass("primary")}>
            Back to your tryouts
          </Link>
        </div>
      ) : null}
    </>
  );
}
