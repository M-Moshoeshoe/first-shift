"use client";

import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/Button";
import { CheckboxField } from "@/components/ui/CheckboxField";
import { FormError } from "@/components/ui/FormError";
import { TextField } from "@/components/ui/TextField";
import { CHECK_IN_MESSAGES, DAY_COPY } from "@/domain/dayMessages";
import { useStep } from "@/lib/useStep";

const ERROR_ID = "check-in-error";

/** The owner at the door: the three checks, then the code the young person shows. The server checks it all again. */
export function CheckInForm({ bookingId, name, lastFour, done }: { bookingId: string; name: string; lastFour: string; done: () => void }) {
  const [check, setCheck] = useState({ faceMatches: false, nameMatches: false, lastFourMatches: false });
  const [code, setCode] = useState("");
  const step = useStep(`/api/bookings/${encodeURIComponent(bookingId)}/check-in`, CHECK_IN_MESSAGES.not_found, done);
  const toggle = (key: keyof typeof check) => (checked: boolean) => setCheck((current) => ({ ...current, [key]: checked }));

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (step.busy) return;
    if (!check.faceMatches || !check.nameMatches || !check.lastFourMatches) return step.setError(CHECK_IN_MESSAGES.door_check);
    void step.send({ ...check, code });
  };

  return (
    <form noValidate onSubmit={submit} aria-labelledby="door-heading" className="flex flex-col gap-4 border border-line p-4">
      <div className="flex flex-col gap-2">
        <h2 id="door-heading" className="text-xl font-bold">
          {DAY_COPY.doorTitle}
        </h2>
        <p className="text-sm text-muted">{DAY_COPY.doorHint}</p>
      </div>
      <CheckboxField id="door-face" label={DAY_COPY.face} checked={check.faceMatches} onChange={toggle("faceMatches")} />
      <CheckboxField id="door-name" label={DAY_COPY.name(name)} checked={check.nameMatches} onChange={toggle("nameMatches")} />
      <CheckboxField id="door-last-four" label={DAY_COPY.lastFour(lastFour)} checked={check.lastFourMatches} onChange={toggle("lastFourMatches")} />
      <TextField id="door-code" label={DAY_COPY.code} hint={DAY_COPY.codeHint} inputMode="numeric" autoComplete="off" maxLength={7} value={code} onChange={(event) => setCode(event.target.value)} />
      <div className="flex flex-col gap-3">
        <Button type="submit" busy={step.busy} busyLabel="Checking in" aria-describedby={ERROR_ID}>
          {DAY_COPY.checkIn(name)}
        </Button>
        <FormError id={ERROR_ID} message={step.error} />
      </div>
    </form>
  );
}
