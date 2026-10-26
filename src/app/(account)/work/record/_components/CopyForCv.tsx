"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { FormError } from "@/components/ui/FormError";
import { CV_COPY } from "@/domain/recordCopy";
import { toast } from "@/lib/toast";

/**
 * "Copy for my CV": puts the record's ready-to-paste text (domain/cvText.ts)
 * on the clipboard and says so in a toast. Where the phone refuses the
 * clipboard, it says so and shows the text to copy by hand.
 */
export function CopyForCv({ text }: { text: string }) {
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);

  const copy = async () => {
    setBusy(true);
    setFailed(false);
    try {
      await navigator.clipboard.writeText(text);
      toast(CV_COPY.copied);
    } catch {
      setFailed(true);
    }
    setBusy(false);
  };

  return (
    <div className="flex flex-col gap-3">
      <Button variant="secondary" busy={busy} busyLabel={CV_COPY.copying} aria-describedby="cv-copy-error" onClick={() => void copy()}>
        {CV_COPY.copy}
      </Button>
      <FormError id="cv-copy-error" message={failed ? CV_COPY.copyFailed : null} />
      {failed ? <textarea readOnly aria-label={CV_COPY.copy} value={text} rows={8} className="w-full border border-edge p-3 text-[1rem]" /> : null}
    </div>
  );
}
