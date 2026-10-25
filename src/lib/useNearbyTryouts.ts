"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { FINDING_MESSAGES } from "@/domain/findingMessages";
import { NearbySchema, type NearbyResponse } from "@/schemas/finding";
import { ApiError, apiGet } from "./api";

/** Coming back to the page refreshes the list, but not more than this often, to save data. */
const FOCUS_REFRESH_MS = 30_000;

export interface NearbyTryouts {
  data: NearbyResponse | null;
  /** A failed load or refresh. The last list stays on screen under it. */
  error: string | null;
  loading: boolean;
  /** Ids that arrived with a refresh, so only they use item-enter; the first list appears at once. */
  fresh: ReadonlySet<string>;
  refresh: () => void;
}

/**
 * The nearby feed from GET /api/tryouts/nearby, never Firestore in the
 * browser: a small JSON reply, and demo and real kept apart on the server.
 * It loads once, again on Refresh, and again when the person comes back to
 * the page after a while.
 */
export function useNearbyTryouts(): NearbyTryouts {
  const [data, setData] = useState<NearbyResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [fresh, setFresh] = useState<ReadonlySet<string>>(new Set());
  const known = useRef<Set<string> | null>(null);
  const lastLoad = useRef(0);
  const inFlight = useRef(false);

  const load = useCallback(() => {
    if (inFlight.current) return;
    inFlight.current = true;
    lastLoad.current = Date.now();
    setLoading(true);
    apiGet("/api/tryouts/nearby", NearbySchema).then(
      (next) => {
        const ids = next.status === "ok" ? next.items.map((item) => item.id) : [];
        const seen = known.current;
        setFresh(new Set(seen ? ids.filter((id) => !seen.has(id)) : []));
        known.current = new Set([...(seen ?? []), ...ids]);
        setData(next);
        setError(null);
      },
      (caught: unknown) => setError(caught instanceof ApiError ? caught.message : FINDING_MESSAGES.feedUnavailable),
    ).finally(() => {
      inFlight.current = false;
      setLoading(false);
    });
  }, []);

  useEffect(() => {
    load();
    const onFocus = () => {
      if (Date.now() - lastLoad.current >= FOCUS_REFRESH_MS) load();
    };
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [load]);

  return { data, error, loading, fresh, refresh: load };
}
