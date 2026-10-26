import "server-only";
import { readFile } from "node:fs/promises";
import { ImageResponse } from "next/og";
import { join } from "node:path";
import type { ReactNode } from "react";
import { log } from "./log";
import { liveReferenceService } from "./services/liveRecordServices";

/** 1200 by 630, the size every chat app and network previews. */
export const SHARE_SIZE = { width: 1200, height: 630 };

const INK = "#0F2D24";
const GOLD = "#FFB81C";
const MUTED = "#43584F";

/** The wordmark as a data URL, read from the repo at render time (src/assets). */
async function logoDataUrl(): Promise<string> {
  const bytes = await readFile(join(process.cwd(), "src", "assets", "header-logo.png"));
  return `data:image/png;base64,${bytes.toString("base64")}`;
}

/** The shared frame: the logo top left, the content, and a line of small print. Plain flex layout, as ImageResponse needs. */
function ShareFrame({ logo, children, footnote }: { logo: string; children: ReactNode; footnote: string }) {
  return (
    <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between", background: "#FFFFFF", color: INK, padding: 72, fontFamily: "sans-serif" }}>
      {/* eslint-disable-next-line @next/next/no-img-element -- ImageResponse draws plain img elements only. */}
      <img src={logo} alt="" width={256} height={64} />
      {children}
      <div style={{ display: "flex", fontSize: 24, color: MUTED }}>{footnote}</div>
    </div>
  );
}

/** A shift slip in the share image: the gold stub with the day, then the pay and the business. */
function ShareSlip({ day, hours, pay, business, place }: { day: string; hours: string; pay: string; business: string; place: string }) {
  return (
    <div style={{ display: "flex", border: `4px solid ${INK}`, width: 520 }}>
      <div style={{ display: "flex", flexDirection: "column", justifyContent: "center", background: GOLD, padding: "24px 20px", borderRight: `4px dashed ${INK}`, width: 170 }}>
        <div style={{ fontSize: 26, fontWeight: 700 }}>{day}</div>
        <div style={{ fontSize: 22 }}>{hours}</div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", padding: "20px 24px", gap: 4 }}>
        <div style={{ fontSize: 44, fontWeight: 700 }}>{pay}</div>
        <div style={{ fontSize: 24 }}>{business}</div>
        <div style={{ fontSize: 20, color: MUTED }}>{place}</div>
      </div>
    </div>
  );
}

/** The site's preview (src/app/opengraph-image.ts): the logo, the promise and an example slip. */
export async function siteShareImage(): Promise<ImageResponse> {
  const logo = await logoDataUrl();
  return new ImageResponse(
    <ShareFrame logo={logo} footnote="Built for the FNB App of the Year Hackathon 2026">
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 48 }}>
        <div style={{ display: "flex", fontSize: 64, fontWeight: 700, lineHeight: 1.05, letterSpacing: -2, width: 520 }}>Every job wants experience. Get yours in a day.</div>
        <ShareSlip day="Saturday" hours="9:00 to 15:00" pay="R210.00" business="Sipho's Phone Repairs" place="Randburg, from Ivory Park" />
      </div>
    </ShareFrame>,
    SHARE_SIZE,
  );
}

/** A shared record's first name and verified tryouts, or null for an unknown link (the plain card then). */
async function recordSummary(token: string): Promise<{ firstName: string; count: number } | null> {
  try {
    const record = await liveReferenceService().shared(token);
    return record ? { firstName: record.firstName, count: record.entries.length } : null;
  } catch (error) {
    log("warn", "record_share_image_failed", { reason: error instanceof Error ? error.message : "unknown" });
    return null;
  }
}

/** A shared work record's preview: the first name and how many tryouts are verified. Nothing else, ever. */
export async function recordShareImage(token: string): Promise<ImageResponse> {
  const [logo, record] = await Promise.all([logoDataUrl(), recordSummary(token)]);
  const title = record ? `${record.firstName}'s work record` : "A work record";
  const line = record ? `${record.count} paid ${record.count === 1 ? "tryout" : "tryouts"}, each confirmed by the business and by ${record.firstName}.` : "Paid tryouts, each confirmed by the business and the young person.";
  return new ImageResponse(
    <ShareFrame logo={logo} footnote="Verified on First Shift">
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <div style={{ display: "flex", fontSize: 72, fontWeight: 700, letterSpacing: -2 }}>{title}</div>
        <div style={{ display: "flex", fontSize: 32 }}>{line}</div>
      </div>
    </ShareFrame>,
    SHARE_SIZE,
  );
}
