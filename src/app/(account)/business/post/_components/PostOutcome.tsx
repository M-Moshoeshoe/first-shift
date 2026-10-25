"use client";

import Link from "next/link";
import { Button, buttonClass } from "@/components/ui/Button";
import { Stamp } from "@/components/ui/Stamp";
import { SUPPORT_EMAIL } from "@/config/contact";
import { useHeadingFocus } from "@/lib/useHeadingFocus";

export type Outcome = { kind: "published" } | { kind: "review" } | { kind: "blocked"; saferOption: string } | { kind: "no_credits" };

const backToTryouts = (
  <Link href="/business" className={buttonClass("primary")}>
    Back to your tryouts
  </Link>
);

/** Step 3: what happened to the tryout, and one clear next step. Never a dead end. */
export function PostOutcome({ outcome, onChangeRequest }: { outcome: Outcome; onChangeRequest: () => void }) {
  // Focus lands on the first thing that says what happened: a heading, or the sentence when there isn't one.
  const heading = useHeadingFocus<HTMLHeadingElement & HTMLParagraphElement>(true);

  if (outcome.kind === "published") {
    return (
      <div role="status" className="flex flex-col items-start gap-4">
        <Stamp label="Posted" />
        <p ref={heading} tabIndex={-1} className="text-lg">
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
        <p className="text-lg">We couldn&apos;t tell what kind of work this is, so someone will check it before it goes live. You&apos;ll see it on your dashboard.</p>
        {backToTryouts}
      </div>
    );
  }

  if (outcome.kind === "blocked") {
    return (
      <div className="flex flex-col gap-4">
        <h2 ref={heading} tabIndex={-1} className="text-xl font-bold">
          This work can&apos;t be a tryout
        </h2>
        <p className="border-2 border-stop p-4 text-lg">{outcome.saferOption}</p>
        <Button onClick={onChangeRequest}>Change my request</Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <p ref={heading} tabIndex={-1} className="text-lg">
        You&apos;ve used your free tryouts. Top-ups open soon. Contact us at{" "}
        <a href={`mailto:${SUPPORT_EMAIL}`} className="underline">
          {SUPPORT_EMAIL}
        </a>{" "}
        if you need more now.
      </p>
      {backToTryouts}
    </div>
  );
}
