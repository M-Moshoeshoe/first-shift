"use client";

import { useEffect, useState } from "react";
import { clientAuth } from "@/lib/firebaseClient";

/**
 * A square photo of a person or a shopfront, from GET /api/photos, which
 * checks the viewer may see it (an application or a booking between them).
 * The request carries the sign-in token, so the photo arrives as a blob URL.
 * Without one (none uploaded, or no permission), a plain square says so.
 * Square, never a circle (docs/DESIGN.md, Shape).
 */
/** 96 px on detail screens; 48 px in a compact list row. */
const SIZES = { md: { px: 96, box: "size-24" }, sm: { px: 48, box: "size-12" } } as const;

export function PersonPhoto({ subject, kind, alt, size = "md" }: { subject: string; kind: "profile" | "shopfront"; alt: string; size?: keyof typeof SIZES }) {
  const { px, box } = SIZES[size];
  const [url, setUrl] = useState<string | null>(null);
  const [missing, setMissing] = useState(false);

  useEffect(() => {
    let current = true;
    let objectUrl: string | null = null;
    const user = clientAuth().currentUser;
    if (!user) return undefined;
    user
      .getIdToken()
      .then((token) => fetch(`/api/photos/${encodeURIComponent(subject)}/${kind}`, { headers: { authorization: `Bearer ${token}` } }))
      .then(async (response) => {
        if (!response.ok) throw new Error(String(response.status));
        objectUrl = URL.createObjectURL(await response.blob());
        if (current) setUrl(objectUrl);
      })
      .catch(() => current && setMissing(true));
    return () => {
      current = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [subject, kind]);

  // A blob from our own server, already sized on upload: nothing for the image optimiser to do.
  // eslint-disable-next-line @next/next/no-img-element -- a blob or API URL, already unoptimized: next/image would only add its client code.
  if (url) return <img src={url} alt={alt} width={px} height={px} className={`${box} shrink-0 border border-line object-cover`} />;
  // alt="" marks the photo as decorative, as beside a name in a list row: then the placeholder is hidden too.
  const label = alt ? { role: "img", "aria-label": missing ? `${alt}: no photo` : `${alt}: loading` } : { "aria-hidden": true };
  return (
    <div {...label} className={`flex ${box} shrink-0 items-center justify-center border border-mist bg-mist p-1 text-center text-sm text-muted ${missing ? "" : "skeleton"}`}>
      {missing && size === "md" ? "No photo" : null}
    </div>
  );
}
