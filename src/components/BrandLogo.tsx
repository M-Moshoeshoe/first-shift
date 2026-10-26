import logo from "@/assets/header-logo.png";

/**
 * The owner's wordmark, at any height: drawn from a 128 px tall file, so it
 * stays crisp at 2x and beyond. A plain img on purpose: next/image would add
 * its client code to every page, and this file is already sized for screens.
 */
export function BrandLogo({ height = 28, priority = false }: { height?: number; priority?: boolean }) {
  const width = Math.round((logo.width / logo.height) * height);
  // eslint-disable-next-line @next/next/no-img-element -- see the comment above: no client code for a fixed-size logo.
  return <img src={logo.src} alt="First Shift" width={width} height={height} decoding="async" fetchPriority={priority ? "high" : "auto"} />;
}
