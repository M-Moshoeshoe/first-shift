"use client";

import Link from "next/link";
import { buttonClass } from "@/components/ui/Button";
import { Stamp } from "@/components/ui/Stamp";
import { POSTING_PROBLEM_MESSAGES } from "@/domain/tryoutMessages";
import { useHeadingFocus } from "@/lib/useHeadingFocus";
import { BlockedResult } from "./BlockedResult";

export type Outcome = { kind: "published" } | { kind: "review" } | { kind: "blocked"; saferOption: string; saferRequest: string; phrase: string | null } | { kind: "no_credits" };

const backToTryouts = (
  <Link href="/business" className={buttonClass("primary")}>
    Back to your tryouts
  </Link>
);

/** Step 3: what happened to the tryout, and one clear next step. Never a dead end. */
export function PostOutcome({ outcome, request, onChangeRequest, onUseInstead }: { outcome: Outcome; request: string; onChangeRequest: () => void; onUseInstead: (request: string) => void }) {
  // Focus lands on the first thing that says what happened: a heading, or the sentence when there isn't one.
  const heading = useHeadingFocus<HTMLHeadingElement & HTMLParagraphElement>(true);

  if (outcome.kind === "published") {
    return (
      <div role="status" className="flex flex-col items-start gap-4">
        <Stamp label="Posted" />
        <p ref={heading} tabIndex={-1} className="text-base">
          Your tryout is live. Young people nearby can now apply.
        </p>
        {backToTryouts}
      </div>
    );
  }

  if (outcome.kind === "review") {
    return (
      <div className="flex flex-col gap-4">
        <h2 ref={heading} tabIndex={-1} className="text-xl font-bold">
          We&apos;re checking this one
        </h2>
        <p className="text-base">We could not tell what kind of work this is, so someone will check it before it goes live. You&apos;ll see it on your dashboard.</p>
        {backToTryouts}
      </div>
    );
  }

  if (outcome.kind === "blocked") {
    return <BlockedResult request={request} reason={outcome.saferOption} saferRequest={outcome.saferRequest} phrase={outcome.phrase} onUseInstead={() => onUseInstead(outcome.saferRequest)} onEdit={onChangeRequest} />;
  }

  return (
    <div className="flex flex-col gap-4">
      <p ref={heading} tabIndex={-1} className="text-base">
        {POSTING_PROBLEM_MESSAGES.no_credits}
      </p>
      <Link href="/business/credits" className={buttonClass("primary")}>
        Open Credits
      </Link>
    </div>
  );
}
