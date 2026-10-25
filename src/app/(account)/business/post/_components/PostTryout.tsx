"use client";

import { useState } from "react";
import { StepProgress } from "@/components/ui/StepProgress";
import { PROFILE_MESSAGES } from "@/domain/messages";
import { ApiError, apiPost } from "@/lib/api";
import { useGatedProfile } from "@/lib/auth/gatedProfile";
import { DraftResultSchema, PostResultSchema, type PostTryoutInput } from "@/schemas/tryout";
import { CheckStep } from "./CheckStep";
import { initialCheck, type CheckDraft } from "./checkForm";
import { DescribeStep } from "./DescribeStep";
import { PostOutcome, type Outcome } from "./PostOutcome";

type Step = "describe" | "check" | "outcome";
const STEP_NUMBER: Record<Step, number> = { describe: 1, check: 2, outcome: 3 };

const messageOf = (caught: unknown) => (caught instanceof ApiError ? caught.message : PROFILE_MESSAGES.fallback);

/**
 * Posting a tryout in three steps: one sentence, the drafted tryout to check
 * and edit, then what happened. Every rule is decided on the server
 * (POST /api/tryouts/draft and POST /api/tryouts); the screen only shows it.
 * With no credit left, it says so straight away instead of a form.
 */
export function PostTryout() {
  const { business } = useGatedProfile();
  const hasCredit = (business?.credits.available ?? 0) > 0;
  const [step, setStep] = useState<Step>(hasCredit ? "describe" : "outcome");
  const [outcome, setOutcome] = useState<Outcome>({ kind: "no_credits" });
  const [description, setDescription] = useState("");
  const [check, setCheck] = useState<CheckDraft | null>(null);
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [returned, setReturned] = useState(false);

  const finish = (next: Outcome) => {
    setOutcome(next);
    setStep("outcome");
  };

  /** A refusal that has its own screen (no credit left), or a message under the button. */
  const refuse = (caught: unknown) => {
    if (caught instanceof ApiError && caught.code === "no_credits") return finish({ kind: "no_credits" });
    setFormError(messageOf(caught));
  };

  const draft = async (text: string) => {
    setBusy(true);
    setFormError(null);
    setDescription(text);
    try {
      const result = await apiPost("/api/tryouts/draft", { description: text }, DraftResultSchema);
      if (result.outcome === "blocked") finish({ kind: "blocked", saferOption: result.saferOption });
      else {
        setCheck(initialCheck(result.draft, new Date()));
        setStep("check");
      }
    } catch (caught) {
      refuse(caught);
    }
    setBusy(false);
  };

  const post = async (input: PostTryoutInput, form: CheckDraft) => {
    setBusy(true);
    setFormError(null);
    setCheck(form);
    try {
      const result = await apiPost("/api/tryouts", input, PostResultSchema);
      finish(result.outcome === "blocked" ? { kind: "blocked", saferOption: result.saferOption } : { kind: result.outcome });
    } catch (caught) {
      refuse(caught);
    }
    setBusy(false);
  };

  const backToDescribe = () => {
    setFormError(null);
    setReturned(true);
    setStep("describe");
  };

  return (
    <div className="flex flex-col gap-6">
      {/* "All steps done" only when the tryout really went live; a refusal or a review isn't done. */}
      {step !== "outcome" || outcome.kind === "published" ? (
        <StepProgress current={STEP_NUMBER[step]} done={step === "outcome" ? 3 : STEP_NUMBER[step] - 1} total={3} label="Posting steps" />
      ) : null}
      {step === "describe" ? <DescribeStep initial={description} focusField={returned} busy={busy} formError={formError} onDraft={(text) => void draft(text)} /> : null}
      {step === "check" && check ? (
        <CheckStep
          initial={check}
          description={description}
          busy={busy}
          formError={formError}
          onPost={(input, form) => void post(input, form)}
          onBack={(form) => {
            setCheck(form);
            backToDescribe();
          }}
        />
      ) : null}
      {step === "outcome" ? <PostOutcome outcome={outcome} onChangeRequest={backToDescribe} /> : null}
    </div>
  );
}
