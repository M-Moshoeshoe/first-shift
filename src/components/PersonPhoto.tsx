"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { clientAuth } from "@/lib/firebaseClient";

/**
 * A square photo of a person or a shopfront, from GET /api/photos, which
 * checks the viewer may see it (an application or a booking between them).
 * The request carries the sign-in token, so the photo arrives as a blob URL.
 * Without one (none uploaded, or no permission), a plain square says so.
 * Square, never a circle (docs/DESIGN.md, Shape).
 */
export function PersonPhoto({ subject, kind, alt }: { subject: string; kind: "profile" | "shopfront"; alt: string }) {
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
  if (url) return <Image src={url} alt={alt} width={96} height={96} unoptimized className="size-24 shrink-0 border-2 border-ink object-cover" />;
  return (
    <div role="img" aria-label={missing ? `${alt}: no photo` : `${alt}: loading`} className={`flex size-24 shrink-0 items-center justify-center border-2 border-mist bg-mist p-1 text-center text-sm text-muted ${missing ? "" : "animate-skeleton"}`}>
      {missing ? "No photo" : null}
    </div>
  );
}
