"use client";

import { useEffect, useState } from "react";
import { FINDING_MESSAGES } from "@/domain/findingMessages";
import { TryoutDetailSchema, type ApplyStateResponse, type TryoutDetailResponse } from "@/schemas/finding";
import { ApiError, apiGet } from "./api";

export type TryoutDetail =
  | { status: "loading" }
  | { status: "error"; message: string; notFound: boolean }
  | { status: "ready"; detail: TryoutDetailResponse };

/** One tryout from GET /api/tryouts/[id]. setState shows a new apply state straight away, after applying or withdrawing. */
export function useTryoutDetail(id: string, attempt: number): { detail: TryoutDetail; setState: (state: ApplyStateResponse) => void } {
  const [loaded, setLoaded] = useState<{ key: string; detail: TryoutDetail } | null>(null);
  const key = `${id}#${attempt}`;

  useEffect(() => {
    let current = true;
    apiGet(`/api/tryouts/${encodeURIComponent(id)}`, TryoutDetailSchema).then(
      (detail) => current && setLoaded({ key, detail: { status: "ready", detail } }),
      (caught: unknown) => {
        const message = caught instanceof ApiError ? caught.message : FINDING_MESSAGES.detailUnavailable;
        if (current) setLoaded({ key, detail: { status: "error", message, notFound: caught instanceof ApiError && caught.status === 404 } });
      },
    );
    return () => {
      current = false;
    };
  }, [id, key]);

  const setState = (state: ApplyStateResponse) =>
    setLoaded((previous) => (previous?.detail.status === "ready" ? { key: previous.key, detail: { status: "ready", detail: { ...previous.detail.detail, state } } } : previous));

  return { detail: loaded?.key === key ? loaded.detail : { status: "loading" }, setState };
}
