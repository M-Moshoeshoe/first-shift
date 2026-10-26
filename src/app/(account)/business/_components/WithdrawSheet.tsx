"use client";

import { useState } from "react";
import { Dialog, Heading } from "react-aria-components/Dialog";
import { Modal, ModalOverlay } from "react-aria-components/Modal";
import { Button } from "@/components/ui/Button";
import { FormError } from "@/components/ui/FormError";
import { PROFILE_MESSAGES } from "@/domain/messages";
import { ApiError, apiPost } from "@/lib/api";
import { toast } from "@/lib/toast";
import { WithdrawResultSchema } from "@/schemas/tryout";

const ERROR_ID = "withdraw-error";

interface WithdrawSheetProps {
  /** The tryout to withdraw; the sheet is open while there is one. */
  tryoutId: string | null;
  onClose: () => void;
}

/**
 * The withdraw confirmation, as a bottom sheet: React Aria's Modal and Dialog
 * for focus trapping, Escape and the backdrop tap, styled only with our tokens
 * through its data attributes, and moving only with sheet-enter and sheet-exit
 * (AGENTS.md, React Aria: one use only). The server decides; the listener on
 * the dashboard shows the new status.
 */
export function WithdrawSheet({ tryoutId, onClose }: WithdrawSheetProps) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const close = () => {
    if (busy) return;
    setError(null);
    onClose();
  };

  const withdraw = async () => {
    if (!tryoutId || busy) return;
    setBusy(true);
    setError(null);
    try {
      await apiPost(`/api/tryouts/${encodeURIComponent(tryoutId)}/withdraw`, {}, WithdrawResultSchema);
      // It moves to the folded Past group, so say it happened.
      toast("Tryout withdrawn");
      setBusy(false);
      onClose();
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : PROFILE_MESSAGES.fallback);
      setBusy(false);
    }
  };

  return (
    <ModalOverlay
      isOpen={tryoutId !== null}
      isDismissable={!busy}
      onOpenChange={(open) => (open ? undefined : close())}
      className="fixed inset-0 z-20 flex items-end justify-center bg-ink/40 data-entering:animate-scrim-in data-exiting:animate-scrim-out"
    >
      <Modal className="w-full max-w-md border border-b-0 border-line bg-paper data-entering:animate-sheet-enter data-exiting:animate-sheet-exit">
        <Dialog className="flex flex-col gap-6 px-5 pt-6 pb-8 outline-none">
          <div className="flex flex-col gap-2">
            <Heading slot="title" className="text-xl font-semibold">
              Withdraw this tryout?
            </Heading>
            <p className="text-base">Young people will not see it anymore. You can post a new one at any time.</p>
          </div>
          <div className="flex flex-col gap-3">
            <Button variant="stop" busy={busy} busyLabel="Withdrawing" aria-describedby={ERROR_ID} onClick={() => void withdraw()}>
              Withdraw tryout
            </Button>
            <Button variant="secondary" disabled={busy} onClick={close}>
              Keep it
            </Button>
            <FormError id={ERROR_ID} message={error} />
          </div>
        </Dialog>
      </Modal>
    </ModalOverlay>
  );
}
