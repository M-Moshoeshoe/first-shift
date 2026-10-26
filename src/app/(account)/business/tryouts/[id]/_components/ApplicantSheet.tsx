"use client";

import { Dialog, Heading } from "react-aria-components/Dialog";
import { Modal, ModalOverlay } from "react-aria-components/Modal";
import { Button } from "@/components/ui/Button";
import { FormError } from "@/components/ui/FormError";
import { OWNER_COPY } from "@/domain/bookingMessages";
import type { ApplicantResponse } from "@/schemas/booking";
import { ApplicantDetails } from "./ApplicantDetails";

const ERROR_ID = "offer-error";

interface ApplicantSheetProps {
  isOpen: boolean;
  /** The applicant shown, kept while the sheet closes. */
  applicant: ApplicantResponse | null;
  /** Whether an offer can be made now: no offer waiting, nobody booked, booking still open. */
  canOffer: boolean;
  busy: boolean;
  error: string | null;
  onOffer: (workerId: string) => void;
  onClose: () => void;
}

/**
 * An applicant's details and the one action, as a bottom sheet: the same React
 * Aria Modal and Dialog as the withdraw confirmation, styled with our tokens
 * and moving only with sheet-enter and sheet-exit (AGENTS.md, React Aria). An
 * example applicant in the demo can be read but not offered, and says why.
 */
export function ApplicantSheet({ isOpen, applicant, canOffer, busy, error, onOffer, onClose }: ApplicantSheetProps) {
  return (
    <ModalOverlay
      isOpen={isOpen}
      isDismissable={!busy}
      onOpenChange={(open) => (open || busy ? undefined : onClose())}
      className="fixed inset-0 z-20 flex items-end justify-center bg-ink/40 data-entering:animate-scrim-in data-exiting:animate-scrim-out"
    >
      <Modal className="max-h-[90dvh] w-full max-w-md overflow-y-auto border border-b-0 border-line bg-paper data-entering:animate-sheet-enter data-exiting:animate-sheet-exit">
        {applicant ? (
          <Dialog className="flex flex-col gap-6 px-5 pt-6 pb-8 outline-none">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
              <Heading slot="title" className="text-title">
                {applicant.firstName}
              </Heading>
              {applicant.example ? <span className="border border-line px-1.5 text-micro text-muted">{OWNER_COPY.example}</span> : null}
            </div>
            <ApplicantDetails applicant={applicant} />
            <div className="flex flex-col gap-3">
              {applicant.example ? (
                <>
                  <Button variant="primary" disabled aria-describedby="example-note">
                    {OWNER_COPY.offer(applicant.firstName)}
                  </Button>
                  <p id="example-note" className="text-sm text-muted">
                    {OWNER_COPY.exampleNote}
                  </p>
                </>
              ) : canOffer ? (
                <Button variant="primary" busy={busy} busyLabel="Offering" aria-describedby={ERROR_ID} onClick={() => onOffer(applicant.workerId)}>
                  {OWNER_COPY.offer(applicant.firstName)}
                </Button>
              ) : null}
              <FormError id={ERROR_ID} message={error} />
              <Button variant="secondary" disabled={busy} onClick={onClose}>
                {OWNER_COPY.close}
              </Button>
            </div>
          </Dialog>
        ) : null}
      </Modal>
    </ModalOverlay>
  );
}
