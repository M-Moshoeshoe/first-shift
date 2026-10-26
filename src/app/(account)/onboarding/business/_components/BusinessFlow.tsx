"use client";

import { lazy, Suspense, useState } from "react";
import { ProfileDone } from "@/components/ProfileDone";
import type { OwnerDraft } from "@/components/OwnerDetailsForm";
import { StepProgress } from "@/components/ui/StepProgress";
import { pinPrecisionText } from "@/domain/messages";
import type { ProfileViewResponse } from "@/schemas/profile";
import { BusinessDetailsStep, type BusinessDraft } from "./BusinessDetailsStep";
import { PinStep } from "./PinStep";
import { ShopfrontStep } from "./ShopfrontStep";
import { BUSINESS_STEPS as STEPS, useBusinessSteps } from "./useBusinessSteps";

// The owner's two steps load when they're reached, so the first step stays inside the page's budget.
const OwnerDetailsForm = lazy(() => import("@/components/OwnerDetailsForm").then((module) => ({ default: module.OwnerDetailsForm })));
const OwnerPhotoStep = lazy(() => import("@/components/OwnerPhotoStep").then((module) => ({ default: module.OwnerPhotoStep })));

const loading = <div role="status" aria-label="Loading the next step" className="h-96 skeleton" />;

/**
 * Five steps: the business, the owner's details, the owner's photo, the
 * premises pin and the shopfront photo. Each is saved as soon as it's done,
 * so coming back opens the first thing still missing. The pin can be
 * skipped (location blocked, or not at the business yet), but the profile
 * isn't finished until it's set.
 */
export function BusinessFlow({ view }: { view: ProfileViewResponse }) {
  const saved = view.business;
  const [details, setDetails] = useState<BusinessDraft>({ name: saved?.name ?? "", area: saved?.area ?? "", openingHours: saved?.openingHours ?? "", coida: saved?.coida });
  const [owner, setOwner] = useState<OwnerDraft>({ legalName: saved?.owner.legalName ?? "", phone: saved?.owner.phone ?? "", cipc: saved?.owner.cipc ?? "" });
  const { done, pin, setPin, step, go, mark, firstMissing, moved, finished, finish, doneCount } = useBusinessSteps(saved);

  if (finished) {
    // The pin's precision stays on screen with the Stamp, so the owner always sees how precise it was.
    return (
      <div className="flex flex-col gap-6">
        <StepProgress current={STEPS} done={STEPS} total={STEPS} />
        {pin ? <p className="font-semibold text-go">{pinPrecisionText(pin.accuracyMetres)}</p> : null}
        <ProfileDone next="/business" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <StepProgress current={step} done={doneCount} total={STEPS} />
      {step === 1 ? (
        <BusinessDetailsStep
          initial={details}
          focusHeading={moved}
          onSaved={(draft) => {
            setDetails(draft);
            go(firstMissing(mark("details")));
          }}
        />
      ) : step === 2 ? (
        <Suspense fallback={loading}>
          <OwnerDetailsForm
            initial={owner}
            onBack={() => go(1)}
            onSaved={(draft) => {
              setOwner(draft);
              mark("owner");
              go(3);
            }}
          />
        </Suspense>
      ) : step === 3 ? (
        <Suspense fallback={loading}>
          <OwnerPhotoStep
            owner={owner}
            onBack={() => go(2)}
            onSaved={(result) => {
              mark("ownerPhoto");
              if (result.complete) finish();
              else go(pin ? 5 : 4);
            }}
          />
        </Suspense>
      ) : step === 4 ? (
        <PinStep
          details={details}
          pin={pin}
          hasPhoto={done.shopfront}
          focusHeading={moved}
          onPinned={(next, complete) => {
            setPin(next);
            if (complete) finish();
          }}
          onNext={() => go(5)}
          onSkip={() => go(5)}
          onBack={() => go(3)}
        />
      ) : (
        <ShopfrontStep
          details={details}
          pin={pin}
          focusHeading={moved}
          onSaved={(complete) => {
            mark("shopfront");
            if (complete) finish();
            else go(4);
          }}
          onBack={() => go(4)}
        />
      )}
    </div>
  );
}
