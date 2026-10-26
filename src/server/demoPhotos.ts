import "server-only";
import { crc32, deflateSync } from "node:zlib";
import { RULES } from "@/config/rules";
import type { DemoArt, DemoPhoto } from "@/data/demoArt";
import { sniffImage } from "@/domain/evidence";
import { photoPath, type PhotoKind } from "@/domain/profile";
import { adminBucket } from "./firebaseAdmin";

/*
 * The demo faces and shopfronts. npm run demo:reset uploads the illustrations
 * drawn for them (data/demoArt.ts, scripts/demoArt). "Reset the demo" in the
 * app runs on the server, which has no access to scripts/, so it draws a
 * placeholder here instead, only where no photo is stored yet: small square
 * PNGs in the theme's colours, plain shapes only, a head and shoulders or a
 * shopfront. Never a real face, and nothing to mistake for a real person.
 */
type Rgb = readonly [number, number, number];
type Rect = readonly [x: number, y: number, width: number, height: number, colour: Rgb];

const SIZE = 240;
const INK: Rgb = [0x0f, 0x2d, 0x24];
const MIST: Rgb = [0xef, 0xf5, 0xf1];
const PAPER: Rgb = [0xff, 0xff, 0xff];
const EDGE: Rgb = [0x5f, 0x7a, 0x6d];
/** A face can be drawn in any of these, so a list of demo applicants is told apart at a glance. All from the theme. */
const FACE_TONES: readonly Rgb[] = [EDGE, [0x0a, 0x6b, 0x47], INK, [0x43, 0x58, 0x4f]];

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

/** A SIZE by SIZE RGB PNG of the shape for this kind of photo; tone picks a face's colour from FACE_TONES. */
export function placeholderPng(kind: PhotoKind, tone = 0): Buffer {
  const { background, rects: shapes } = SHAPES[kind];
  const face = FACE_TONES[tone % FACE_TONES.length] ?? EDGE;
  const rects = kind === "profile" ? shapes.map(([x, y, width, height]): Rect => [x, y, width, height, face]) : shapes;
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

/** An illustration's PNG bytes, from whoever can read them (npm run demo:reset), or null. */
export type DemoArtSource = (name: DemoArt) => Uint8Array | null;

/**
 * Puts every demo face and shopfront in place. An illustration is always
 * written, so the latest art replaces whatever was there; it must be a PNG
 * under the photo size limit, or the reset stops. Without one, a placeholder
 * goes only where no photo is stored, so uploaded illustrations stay. Each
 * placeholder face takes the next tone, so a list of them is told apart.
 */
export async function saveDemoPhotos(photos: readonly DemoPhoto[], art: DemoArtSource = () => null): Promise<{ illustrations: number }> {
  const bucket = adminBucket();
  const drawn = await Promise.all(
    photos.map(async ({ uid, kind, art: name }, index) => {
      const file = bucket.file(photoPath(uid, kind));
      const bytes = art(name);
      if (bytes) {
        if (sniffImage(bytes) !== "image/png" || bytes.length > RULES.photoMaxBytes) throw new Error(`The demo illustration ${name} is not a PNG under 2 MB. Run npm run demo:art again.`);
        await file.save(Buffer.from(bytes), { contentType: "image/png", resumable: false });
        return true;
      }
      const [exists] = await file.exists();
      if (!exists) await file.save(placeholderPng(kind, index), { contentType: "image/png", resumable: false });
      return false;
    }),
  );
  return { illustrations: drawn.filter(Boolean).length };
}
