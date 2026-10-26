"use client";

import { OctagonAlert } from "lucide-react";
import { useEffect } from "react";
import { Button } from "@/components/ui/Button";
import { useHeadingFocus } from "@/lib/useHeadingFocus";

/** The request with the words that show the blocked work marked, when the model's quote is really in it. */
function Highlighted({ text, phrase }: { text: string; phrase: string | null }) {
  const at = phrase ? text.toLowerCase().indexOf(phrase.toLowerCase()) : -1;
  if (!phrase || at < 0) return <>{text}</>;
  return (
    <>
      {text.slice(0, at)}
      <mark className="bg-transparent font-semibold text-stop underline decoration-2 underline-offset-4">{text.slice(at, at + phrase.length)}</mark>
      {text.slice(at + phrase.length)}
    </>
  );
}

/**
 * A request that can't be posted gets a result of its own, not a red line in
 * the form (NN/g: visible, at the cause, with a way out): what, why, the words
 * that caused it, and a safer request one tap away. The page title says
 * "Error:" first, so a screen reader hears it straight away.
 */
export function BlockedResult({ request, reason, saferRequest, phrase, onUseInstead, onEdit }: { request: string; reason: string; saferRequest: string; phrase: string | null; onUseInstead: () => void; onEdit: () => void }) {
  const heading = useHeadingFocus<HTMLHeadingElement>(true);
  useEffect(() => {
    const before = document.title;
    document.title = `Error: This cannot be posted. ${before}`;
    return () => {
      document.title = before;
    };
  }, []);
  return (
    <section aria-labelledby="blocked-heading" className="flex flex-col gap-4 border-l-2 border-stop pl-4">
      <h2 id="blocked-heading" ref={heading} tabIndex={-1} className="flex items-center gap-2 text-xl text-stop">
        <OctagonAlert aria-hidden="true" size={22} strokeWidth={2} />
        This cannot be posted
      </h2>
      <p className="text-base">{reason}</p>
      {request ? (
        <div className="flex flex-col gap-1">
          <p className="text-sm font-semibold text-muted">Your request</p>
          <p className="text-base">
            <Highlighted text={request} phrase={phrase} />
          </p>
        </div>
      ) : null}
      <div className="flex flex-col gap-3 border border-line p-4">
        <p className="text-sm font-semibold text-muted">A request you could post instead</p>
        <p className="text-base">{saferRequest}</p>
        <Button onClick={onUseInstead}>Use this instead</Button>
      </div>
      <Button variant="secondary" onClick={onEdit}>
        Edit my request
      </Button>
    </section>
  );
}
