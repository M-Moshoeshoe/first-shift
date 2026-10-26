"use client";

import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/Button";
import { FormError } from "@/components/ui/FormError";
import { TextAreaField } from "@/components/ui/TextAreaField";
import { RULES } from "@/config/rules";
import { BUTTON_LABELS } from "@/domain/buttonLabels";
import { CLOSED_MESSAGES, DETAIL_COPY, FINDING_MESSAGES, NOT_ELIGIBLE_MESSAGES } from "@/domain/findingMessages";
import { ApiError, apiPost } from "@/lib/api";
import { shakeAndFocus } from "@/lib/forms";
import { ApplicationResultSchema, ApplySchema, type ApplyStateResponse } from "@/schemas/finding";
import { OfferAnswer } from "./OfferAnswer";

const NOTE_ID = "application-note";
const ERROR_ID = "application-error";

interface ApplyPanelProps {
  tryoutId: string;
  businessName: string;
  state: ApplyStateResponse;
  onState: (state: ApplyStateResponse) => void;
  /** Reads the tryout again, after an answer to an offer. */
  onReload: () => void;
}

/** Apply with an optional note, or withdraw; or why neither is possible. The server decides again every time. */
export function ApplyPanel({ tryoutId, businessName, state, onState, onReload }: ApplyPanelProps) {
  const [note, setNote] = useState("");
  const [noteError, setNoteError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [withdrawn, setWithdrawn] = useState(false);

  const send = async (path: string, body: unknown, withdrawing: boolean) => {
    setBusy(true);
    setError(null);
    try {
      const result = await apiPost(path, body, ApplicationResultSchema);
      setWithdrawn(withdrawing);
      onState(result.state);
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : FINDING_MESSAGES.detailUnavailable);
    }
    setBusy(false);
  };

  const apply = (event: FormEvent) => {
    event.preventDefault();
    if (busy) return;
    const parsed = ApplySchema.safeParse({ tryoutId, note });
    if (!parsed.success) {
      setNoteError(FINDING_MESSAGES.note);
      requestAnimationFrame(() => shakeAndFocus(NOTE_ID));
      return;
    }
    void send("/api/applications", parsed.data, false);
  };

  if (state.kind === "not_selected" || state.kind === "booked" || state.kind === "offered") return <OfferAnswer tryoutId={tryoutId} state={state} onReload={onReload} />;
  if (state.kind === "closed") return <p className="text-base font-semibold">{CLOSED_MESSAGES[state.reason]}</p>;
  if (state.kind === "not_eligible") return <FormError message={NOT_ELIGIBLE_MESSAGES[state.reason]} />;

  if (state.kind === "applied") {
    return (
      <section aria-labelledby="applied-heading" className="flex flex-col gap-3">
        <div className="flex flex-col gap-2">
          <h2 id="applied-heading" className="text-xl font-bold text-go">
            {DETAIL_COPY.appliedTitle}
          </h2>
          <p className="text-base">{DETAIL_COPY.applied(businessName)}</p>
        </div>
        <Button variant="stop" busy={busy} busyLabel="Withdrawing" aria-describedby={ERROR_ID} onClick={() => void send(`/api/applications/${encodeURIComponent(tryoutId)}/withdraw`, {}, true)}>
          {BUTTON_LABELS.withdrawApplication}
        </Button>
        <FormError id={ERROR_ID} message={error} />
      </section>
    );
  }

  return (
    <form noValidate onSubmit={apply} className="flex flex-col gap-4">
      {withdrawn ? <p className="text-base">{DETAIL_COPY.withdrawn}</p> : null}
      <TextAreaField
        id={NOTE_ID}
        label={DETAIL_COPY.noteLabel}
        hint={DETAIL_COPY.noteHint}
        maxLength={RULES.applicationNoteMaxChars}
        value={note}
        error={noteError}
        onChange={(event) => {
          setNote(event.target.value);
          setNoteError(null);
        }}
      />
      <div className="flex flex-col gap-3">
        <Button type="submit" busy={busy} busyLabel="Applying" aria-describedby={ERROR_ID}>
          {BUTTON_LABELS.apply}
        </Button>
        <FormError id={ERROR_ID} message={error} />
      </div>
    </form>
  );
}
