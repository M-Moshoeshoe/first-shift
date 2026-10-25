"use client";

import { useCallback, useEffect, useState } from "react";
import type { $ZodType } from "zod/v4/core";
import { ApiError, apiGet } from "./api";

export type ApiResource<T> =
  | { status: "loading" }
  | { status: "error"; message: string; notFound: boolean }
  | { status: "ready"; data: T };

/**
 * One server resource for a screen: loads it, reloads it on request (Try
 * again, or after an action), and lets the screen show a new value at once.
 * Every failure becomes a message the person can act on (api.ts).
 */
export function useApi<T>(path: string | null, schema: $ZodType<T>, fallback: string): { resource: ApiResource<T>; reload: () => void; set: (data: T) => void } {
  const [attempt, setAttempt] = useState(0);
  const [loaded, setLoaded] = useState<{ key: string; resource: ApiResource<T> } | null>(null);
  const key = `${path ?? ""}#${attempt}`;

  useEffect(() => {
    if (!path) return undefined;
    let current = true;
    apiGet(path, schema).then(
      (data) => current && setLoaded({ key, resource: { status: "ready", data } }),
      (caught: unknown) => {
        const message = caught instanceof ApiError ? caught.message : fallback;
        if (current) setLoaded({ key, resource: { status: "error", message, notFound: caught instanceof ApiError && caught.status === 404 } });
      },
    );
    return () => {
      current = false;
    };
  }, [path, schema, fallback, key]);

  const reload = useCallback(() => setAttempt((count) => count + 1), []);
  const set = useCallback((data: T) => setLoaded((previous) => (previous ? { key: previous.key, resource: { status: "ready", data } } : previous)), []);
  return { resource: loaded?.key === key ? loaded.resource : { status: "loading" }, reload, set };
}
