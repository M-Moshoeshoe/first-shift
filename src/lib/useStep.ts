"use client";

import { useState } from "react";
import { StepResultSchema } from "@/schemas/booking";
import { ApiError, apiPost } from "./api";

/**
 * One step on a booking (check in, check out, Paid, Received): sends it,
 * shows the server's message if it's refused, and calls done when it lands,
 * so the page reads the booking again and shows where it stands now.
 */
export function useStep(path: string, fallback: string, done: () => void) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const send = async (body: unknown = {}) => {
    setBusy(true);
    setError(null);
    try {
      await apiPost(path, body, StepResultSchema);
      done();
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : fallback);
      setBusy(false);
    }
  };
  return { busy, error, setError, send };
}
