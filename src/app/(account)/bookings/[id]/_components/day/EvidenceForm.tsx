"use client";

import { useEffect, useState, type ChangeEvent, type FormEvent } from "react";
import { buttonClass, Button } from "@/components/ui/Button";
import { FormError } from "@/components/ui/FormError";
import { TextAreaField } from "@/components/ui/TextAreaField";
import { RULES } from "@/config/rules";
import { EVIDENCE_COPY, EVIDENCE_MESSAGES } from "@/domain/dayMessages";
import { blobToBase64, prepareImage } from "@/lib/imageResize";
import { useStep } from "@/lib/useStep";

const FILE_ID = "evidence-file";
const ERROR_ID = "evidence-error";

/**
 * Proof, only after Not received: one screenshot (resized and turned into a
 * JPEG here, at a size a banking screen stays readable) and a note. The
 * server checks what the file really is before it stores it privately.
 */
export function EvidenceForm({ bookingId, done }: { bookingId: string; done: () => void }) {
  const [image, setImage] = useState<{ base64: string; preview: string } | null>(null);
  const [note, setNote] = useState("");
  const [preparing, setPreparing] = useState(false);
  const step = useStep(`/api/bookings/${encodeURIComponent(bookingId)}/evidence`, EVIDENCE_MESSAGES.not_found, done);

  // Free the preview's memory when it's replaced or the form goes away.
  useEffect(() => () => {
    if (image) URL.revokeObjectURL(image.preview);
  }, [image]);

  const choose = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setPreparing(true);
    step.setError(null);
    try {
      const prepared = await prepareImage(file, RULES.evidenceMaxEdgePx);
      setImage({ base64: await blobToBase64(prepared), preview: URL.createObjectURL(prepared) });
    } catch {
      step.setError(EVIDENCE_MESSAGES.not_an_image);
    }
    setPreparing(false);
  };

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (step.busy || preparing) return;
    if (!image) return step.setError(EVIDENCE_COPY.choose);
    if (note.trim().length > RULES.evidenceNoteMaxChars) return step.setError(EVIDENCE_COPY.noteTooLong);
    void step.send({ image: image.base64, note: note.trim() });
  };

  return (
    <form noValidate onSubmit={submit} aria-labelledby="evidence-heading" className="flex flex-col gap-4 border border-line p-4">
      <div className="flex flex-col gap-2">
        <h2 id="evidence-heading" className="text-xl font-bold">
          {EVIDENCE_COPY.title}
        </h2>
        <p className="text-sm text-muted">{EVIDENCE_COPY.hint}</p>
      </div>
      {/* eslint-disable-next-line @next/next/no-img-element -- a blob or API URL, already unoptimized: next/image would only add its client code. */}
      {image ? <img src={image.preview} alt="The screenshot you chose" width={128} height={128} className="size-32 border border-line object-cover" /> : null}
      <label htmlFor={FILE_ID} className={`${buttonClass("secondary")} relative cursor-pointer focus-within:outline-3 focus-within:outline-offset-2 focus-within:outline-ink`}>
        <input id={FILE_ID} type="file" accept="image/*" aria-describedby={ERROR_ID} onChange={(event) => void choose(event)} className="sr-only" />
        <span>{EVIDENCE_COPY.file}</span>
      </label>
      <TextAreaField id="evidence-note" label={EVIDENCE_COPY.note} maxLength={RULES.evidenceNoteMaxChars} value={note} onChange={(event) => setNote(event.target.value)} />
      <div className="flex flex-col gap-3">
        <Button type="submit" busy={step.busy || preparing} busyLabel={EVIDENCE_COPY.sending} aria-describedby={ERROR_ID}>
          {EVIDENCE_COPY.send}
        </Button>
        <FormError id={ERROR_ID} message={step.error} />
      </div>
    </form>
  );
}
