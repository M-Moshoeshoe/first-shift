/** A scene photo in public/photos (docs/CREDITS.md): the full crop at 640 and 1280 wide, or the 8:3 band crop. */
export interface Scene {
  name: string;
  /** The full crop's height at 1280 wide; the band crop is always 1280 by 480. */
  height: number;
  /** What is visible, nothing more: never who the people are or that they use First Shift. */
  alt: string;
}

/**
 * A photo of real work in South Africa, never presented as one of our demo
 * people. Lazy and low priority, so text draws first on a slow connection,
 * and sized up front, so nothing moves when it arrives. Plain img, not
 * next/image: the files are already WebP at the two widths served, and
 * next/image adds about 12 KB of JavaScript.
 */
export function ScenePhoto({ scene, crop = "full", sizes, className = "" }: { scene: Scene; crop?: "full" | "band"; sizes: string; className?: string }) {
  const base = `/photos/${scene.name}${crop === "band" ? "-band" : ""}`;
  return (
    // eslint-disable-next-line @next/next/no-img-element -- already WebP at the widths served; next/image would only add its client code.
    <img
      src={`${base}-640.webp`}
      srcSet={`${base}-640.webp 640w, ${base}-1280.webp 1280w`}
      sizes={sizes}
      width={1280}
      height={crop === "band" ? 480 : scene.height}
      alt={scene.alt}
      loading="lazy"
      fetchPriority="low"
      decoding="async"
      className={`w-full border border-line object-cover ${className}`}
    />
  );
}
