import { recordShareImage, SHARE_SIZE } from "@/server/shareImage";

// A shared work record's preview: the first name and the number of verified tryouts (src/server/shareImage.tsx).
export const alt = "A verified work record on First Shift";
export const size = SHARE_SIZE;
export const contentType = "image/png";

export default async function Image({ params }: { params: Promise<{ token: string }> }) {
  return recordShareImage((await params).token);
}
