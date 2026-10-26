import { beforeEach, describe, expect, it, vi } from "vitest";
import { DEMO_EXAMPLE_APPLICANTS, DEMO_EXAMPLE_OWNERS } from "@/config/demo";
import { DEMO_ART, demoPhotos } from "@/data/demoArt";
import { exampleApplicantUsers } from "@/data/demoApplicants";
import { sniffImage } from "@/domain/evidence";
import { photoPath } from "@/domain/profile";
import { saveDemoPhotos } from "@/server/demoPhotos";
import { readArt } from "../../scripts/demoArt/files";

// Storage in memory: path to what was saved there.
const stored = vi.hoisted(() => new Map<string, { bytes: Buffer; contentType: string }>());
vi.mock("@/server/firebaseAdmin", () => ({
  adminBucket: () => ({
    file: (path: string) => ({
      exists: async () => [stored.has(path)],
      save: async (bytes: Buffer, options: { contentType: string }) => void stored.set(path, { bytes, contentType: options.contentType }),
    }),
  }),
}));

const UIDS = { business: "demo-sipho-uid", youngPerson: "demo-thabo-uid" };
const photos = demoPhotos(UIDS);

describe("the demo's illustrated faces and shopfronts", () => {
  it("give every demo face and shopfront its own illustration, one per photo", () => {
    expect(photos.map((photo) => photo.art).sort()).toEqual([...DEMO_ART].sort());
    expect(photos).toEqual(
      expect.arrayContaining([
        { uid: UIDS.youngPerson, kind: "profile", art: "thabo" },
        { uid: UIDS.business, kind: "profile", art: "sipho" },
        { uid: UIDS.business, kind: "shopfront", art: "sipho-phone-repairs" },
        { uid: "demo-lerato", kind: "shopfront", art: "lerato-spaza" },
        { uid: "demo-ayanda", kind: "shopfront", art: "ayanda-car-wash" },
      ]),
    );
    for (const uid of DEMO_EXAMPLE_OWNERS) expect(photos.some((photo) => photo.uid === uid && photo.kind === "shopfront")).toBe(true);
    expect(new Set(photos.map((photo) => photoPath(photo.uid, photo.kind))).size).toBe(photos.length);
  });

  it("match each example applicant to the illustration with their name", () => {
    const users = exampleApplicantUsers();
    for (const uid of DEMO_EXAMPLE_APPLICANTS) {
      expect(photos.find((photo) => photo.uid === uid && photo.kind === "profile")?.art).toBe(users[uid]?.firstName?.toLowerCase());
    }
  });

  it.each(DEMO_ART)("is committed as a small 384 by 384 PNG: %s", (name) => {
    const png = readArt(name);
    if (!png) throw new Error(`scripts/demoArt/png/${name}.png is missing: run npm run demo:art`);
    expect(sniffImage(png)).toBe("image/png");
    expect([png.readUInt32BE(16), png.readUInt32BE(20)]).toEqual([384, 384]);
    expect(png.length).toBeLessThan(40 * 1024);
  });
});

describe("saving the demo's photos", () => {
  beforeEach(() => stored.clear());

  it("writes every illustration over whatever was there, as a PNG (npm run demo:reset)", async () => {
    const thabo = photoPath(UIDS.youngPerson, "profile");
    stored.set(thabo, { bytes: Buffer.from("an older picture"), contentType: "image/jpeg" });
    expect(await saveDemoPhotos(photos, readArt)).toEqual({ illustrations: DEMO_ART.length });
    expect(stored.get(thabo)).toEqual({ bytes: readArt("thabo"), contentType: "image/png" });
    expect(stored.get(photoPath("demo-ayanda", "shopfront"))?.bytes).toEqual(readArt("ayanda-car-wash"));
  });

  it("without the illustrations, as in the app, draws a placeholder only where nothing is stored", async () => {
    const thabo = photoPath(UIDS.youngPerson, "profile");
    stored.set(thabo, { bytes: Buffer.from("the illustration"), contentType: "image/png" });
    expect(await saveDemoPhotos(photos)).toEqual({ illustrations: 0 });
    expect(stored.get(thabo)?.bytes.toString()).toBe("the illustration");
    const drawn = [...stored].filter(([path]) => path !== thabo).map(([, file]) => file);
    expect(drawn).toHaveLength(photos.length - 1);
    expect(drawn.every(({ bytes, contentType }) => contentType === "image/png" && sniffImage(bytes) === "image/png")).toBe(true);
  });

  it("stops on an illustration that is not a PNG, and says how to fix it", async () => {
    await expect(saveDemoPhotos(photos, () => Buffer.from("<svg onload=alert(1)>"))).rejects.toThrow(/not a PNG under 2 MB\. Run npm run demo:art again/);
  });
});
