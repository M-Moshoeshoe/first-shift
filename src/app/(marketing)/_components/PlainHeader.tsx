/** A photo in public/photos, in the two band crops (docs/CREDITS.md): {name}-band-640.webp (640x320) and {name}-band-1280.webp (1280x480). */
export interface BandPhoto {
  name: string;
  alt: string;
}

/**
 * The header band of a public page: the title and one line on mist, and from
 * 1024 px a photo beside them. The photo is low priority and sized up front,
 * so the title draws first and nothing moves when it arrives.
 */
export function PlainHeader({ title, intro, photo }: { title: string; intro: string; photo?: BandPhoto }) {
  return (
    <div className="bg-mist px-5 py-8 lg:py-16">
      <div className="mx-auto flex max-w-md flex-col gap-6 lg:grid lg:max-w-6xl lg:grid-cols-2 lg:items-center lg:gap-16">
        <div className="flex flex-col gap-3">
          <h1 className="text-title text-balance lg:text-title-lg">{title}</h1>
          <p className="text-base text-muted lg:text-xl">{intro}</p>
        </div>
        {photo ? (
          // Plain img, not next/image: these are already WebP at the two sizes served, and next/image adds about 12 KB of JavaScript.
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={`/photos/${photo.name}-band-640.webp`}
            srcSet={`/photos/${photo.name}-band-640.webp 640w, /photos/${photo.name}-band-1280.webp 1280w`}
            sizes="(min-width: 1024px) 36rem, 100vw"
            width={1280}
            height={480}
            alt={photo.alt}
            // Lazy as well: on a phone it is hidden, and a hidden lazy image is never fetched.
            loading="lazy"
            fetchPriority="low"
            decoding="async"
            className="hidden aspect-8/3 w-full border border-line object-cover lg:block"
          />
        ) : null}
      </div>
    </div>
  );
}
