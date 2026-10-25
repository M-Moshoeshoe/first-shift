"use client";

import { useEffect, useRef, useState } from "react";
import * as z from "zod/mini";
import { TRYOUT_STATUSES, type TryoutStatus } from "@/domain/tryout";

/** One of the owner's tryouts, as the dashboard shows it. */
export interface OwnTryout {
  id: string;
  title: string;
  area: string;
  startAt: Date;
  endAt: Date;
  payCents: number;
  status: TryoutStatus;
  /** Young people who have applied and not withdrawn, kept by the server in the same transaction as each application. */
  applicants: number;
}

export type OwnTryouts =
  | { status: "loading" }
  | { status: "error" }
  /** fresh: ids that arrived after the first snapshot, so only they use item-enter. */
  | { status: "ready"; tryouts: OwnTryout[]; fresh: ReadonlySet<string> };

const instant = z.custom<{ toDate: () => Date }>((value) => typeof value === "object" && value !== null && "toDate" in value);
const TryoutDocSchema = z.object({ title: z.string(), area: z.string(), startAt: instant, endAt: instant, payCents: z.number(), status: z.enum(TRYOUT_STATUSES), applicants: z.optional(z.number()) });

/**
 * A live list of the signed-in owner's tryouts, through a Firestore listener
 * (the rules let an owner read their own, whatever the status). Firestore is
 * loaded only now, after the page has drawn, so it never delays the first
 * screen. A document that doesn't match is left out, never trusted.
 */
export function useOwnTryouts(uid: string, attempt: number): OwnTryouts {
  const [state, setState] = useState<OwnTryouts>({ status: "loading" });
  const known = useRef<Set<string> | null>(null);

  useEffect(() => {
    let unsubscribe: (() => void) | undefined;
    let current = true;
    known.current = null;
    void Promise.all([import("./firebaseDb"), import("firebase/firestore")]).then(
      ([{ clientDb }, { collection, onSnapshot, query, where }]) => {
        if (!current) return;
        unsubscribe = onSnapshot(
          query(collection(clientDb(), "tryouts"), where("ownerId", "==", uid)),
          (snapshot) => {
            const tryouts = snapshot.docs.flatMap((doc) => {
              const parsed = TryoutDocSchema.safeParse(doc.data());
              return parsed.success ? [{ id: doc.id, ...parsed.data, applicants: parsed.data.applicants ?? 0, startAt: parsed.data.startAt.toDate(), endAt: parsed.data.endAt.toDate() }] : [];
            });
            const seen = known.current;
            const fresh = new Set(seen ? tryouts.map((tryout) => tryout.id).filter((id) => !seen.has(id)) : []);
            known.current = new Set([...(seen ?? []), ...tryouts.map((tryout) => tryout.id)]);
            setState({ status: "ready", tryouts, fresh });
          },
          () => setState({ status: "error" }),
        );
      },
      () => current && setState({ status: "error" }),
    );
    return () => {
      current = false;
      unsubscribe?.();
    };
  }, [uid, attempt]);

  return state;
}
