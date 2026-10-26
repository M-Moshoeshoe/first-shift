import "server-only";
import { crc32, deflateSync } from "node:zlib";
import { photoPath, type PhotoKind } from "@/domain/profile";
import { adminBucket } from "./firebaseAdmin";

/*
 * Placeholder photos for the demo accounts and businesses, drawn here as
 * small square PNGs in the theme's colours, so no image file has to ship with
 * the server. Plain shapes only: a head and shoulders, or a shopfront. No
 * real face, and nothing for anyone to mistake for a real person.
 */
type Rgb = readonly [number, number, number];
type Rect = readonly [x: number, y: number, width: number, height: number, colour: Rgb];

const SIZE = 240;
const INK: Rgb = [0x0f, 0x2d, 0x24];
const MIST: Rgb = [0xef, 0xf5, 0xf1];
const PAPER: Rgb = [0xff, 0xff, 0xff];
const EDGE: Rgb = [0x5f, 0x7a, 0x6d];

const SHAPES: Record<PhotoKind, { background: Rgb; rects: readonly Rect[] }> = {
  // A head and shoulders, square-edged like everything else in the product.
  profile: { background: MIST, rects: [[84, 44, 72, 84, EDGE], [44, 148, 152, 92, EDGE]] },
  // A shopfront: the wall, a sign, a window and a door.
  shopfront: { background: MIST, rects: [[24, 40, 192, 200, EDGE], [24, 40, 192, 36, INK], [44, 100, 88, 72, PAPER], [148, 100, 48, 140, INK]] },
};

function chunk(type: string, data: Buffer): Buffer {
  const body = Buffer.concat([Buffer.from(type, "ascii"), data]);
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  const check = Buffer.alloc(4);
  check.writeUInt32BE(crc32(body));
  return Buffer.concat([length, body, check]);
}

/** A SIZE by SIZE RGB PNG of the shape for this kind of photo. */
export function placeholderPng(kind: PhotoKind): Buffer {
  const { background, rects } = SHAPES[kind];
  // Later shapes sit on top of earlier ones.
  const topFirst = [...rects].reverse();
  const rows: Buffer[] = [];
  for (let y = 0; y < SIZE; y += 1) {
    const row = Buffer.alloc(1 + SIZE * 3); // filter byte 0, then the pixels
    for (let x = 0; x < SIZE; x += 1) {
      const hit = topFirst.find(([rx, ry, width, height]) => x >= rx && x < rx + width && y >= ry && y < ry + height);
      row.set(hit ? hit[4] : background, 1 + x * 3);
    }
    rows.push(row);
  }
  const header = Buffer.alloc(13);
  header.writeUInt32BE(SIZE, 0);
  header.writeUInt32BE(SIZE, 4);
  header.set([8, 2, 0, 0, 0], 8); // 8-bit, truecolour, default compression, filter and interlace
  const signature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  return Buffer.concat([signature, chunk("IHDR", header), chunk("IDAT", deflateSync(Buffer.concat(rows))), chunk("IEND", Buffer.alloc(0))]);
}

/** Puts a placeholder at each demo photo path that has no file yet, so every demo face and shopfront shows. */
export async function ensureDemoPhotos(photos: readonly { uid: string; kind: PhotoKind }[]): Promise<void> {
  const bucket = adminBucket();
  await Promise.all(
    photos.map(async ({ uid, kind }) => {
      const file = bucket.file(photoPath(uid, kind));
      const [exists] = await file.exists();
      if (!exists) await file.save(placeholderPng(kind), { contentType: "image/png", resumable: false });
    }),
  );
}
