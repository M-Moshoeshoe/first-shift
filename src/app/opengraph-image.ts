import { SHARE_SIZE, siteShareImage } from "@/server/shareImage";

// The picture a pasted link shows in WhatsApp, X and elsewhere (drawn in src/server/shareImage.tsx).
export const alt = "First Shift: paid one-day tryouts at small businesses near you";
export const size = SHARE_SIZE;
export const contentType = "image/png";

export default function Image() {
  return siteShareImage();
}
