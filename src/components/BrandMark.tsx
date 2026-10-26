import mark from "@/assets/mark.png";

/** The owner's mark alone, as a small badge: a plain img, like BrandLogo, so it carries no client code. Decorative beside a name. */
export function BrandMark({ height = 24 }: { height?: number }) {
  // eslint-disable-next-line @next/next/no-img-element -- a fixed-size badge: next/image would only add its client code.
  return <img src={mark.src} alt="" aria-hidden="true" width={Math.round((mark.width / mark.height) * height)} height={height} />;
}
