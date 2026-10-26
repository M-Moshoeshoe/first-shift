import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type { CDPSession, Page } from "playwright-core";

/**
 * The walkthrough's video: every frame the screen paints, from Chrome's own
 * screencast as near-lossless JPEGs, encoded once with ffmpeg as H.264
 * (CRF 18). Everything plays at normal speed. To stay under the time limit,
 * waiting is cut instead: each wait shows its loading state for a moment,
 * then cuts to the result, and a screen sitting still between taps is
 * shortened. Tools only.
 */
// Served from the site's own address, so the screencast keeps running when the loop begins.
export const TITLE_CARD = `<!doctype html><meta name="viewport" content="width=device-width"><body style="margin:0;height:100vh;display:flex;flex-direction:column;justify-content:center;gap:20px;padding:0 28px;background:#fff;color:#0f2d24;font-family:system-ui,-apple-system,'Segoe UI',sans-serif">
<img src="/icons/header_logo.png" alt="First Shift" style="width:220px;height:auto">
<h1 style="margin:0;font-size:32px;line-height:38px;letter-spacing:-0.02em">First Shift demo.</h1>
<p style="margin:0;font-size:19px;line-height:27px;color:#43584f">Step captions appear at the top of the screen.</p></body>`;

/**
 * Shown at the top of every screen in the video, kept there across page
 * loads. Plain JavaScript text, not a function: tsx compiles functions with
 * a naming helper that does not exist in the page, which broke it silently.
 */
export const CAPTION_SCRIPT = `setInterval(function () {
  var text = sessionStorage.getItem("walk-caption");
  var bar = document.getElementById("walk-caption");
  if (!text) { if (bar) bar.remove(); return; }
  if (!bar) {
    bar = document.createElement("div");
    bar.id = "walk-caption";
    bar.style.cssText = "position:fixed;top:0;left:0;right:0;z-index:2147483647;pointer-events:none;background:#0f2d24;color:#fff;font:600 16px/22px var(--font-archivo),system-ui,sans-serif;padding:14px 20px";
    document.documentElement.append(bar);
  }
  if (bar.textContent !== text) bar.textContent = text;
}, 100);`;

interface Frame {
  file: string;
  at: number;
}

/** From this moment on: "show" plays in full, "act" trims still moments, "wait" keeps only its start (walkthrough.ts). */
export interface PaceMark {
  at: number;
  kind: "show" | "act" | "wait";
}

export interface Screencast {
  stop(): Promise<Frame[]>;
}

export async function startScreencast(page: Page, dir: string, size: { width: number; height: number }): Promise<Screencast> {
  rmSync(dir, { recursive: true, force: true });
  mkdirSync(dir, { recursive: true });
  const cdp: CDPSession = await page.context().newCDPSession(page);
  const frames: Frame[] = [];
  cdp.on("Page.screencastFrame", (event: { data: string; sessionId: number; metadata: { timestamp?: number } }) => {
    const file = join(dir, `${String(frames.length).padStart(5, "0")}.jpg`);
    writeFileSync(file, Buffer.from(event.data, "base64"));
    frames.push({ file, at: event.metadata.timestamp ?? Date.now() / 1000 });
    void cdp.send("Page.screencastFrameAck", { sessionId: event.sessionId }).catch(() => undefined);
  });
  await cdp.send("Page.startScreencast", { format: "jpeg", quality: 95, maxWidth: size.width, maxHeight: size.height, everyNthFrame: 1 });
  return {
    async stop() {
      await cdp.send("Page.stopScreencast").catch(() => undefined);
      return frames;
    },
  };
}

/** Everything encode needs, saved beside the frames, so the video can be encoded again without a new run. */
export interface Timeline {
  frames: Frame[];
  marks: PaceMark[];
}

export const saveTimeline = (file: string, timeline: Timeline) => writeFileSync(file, JSON.stringify(timeline));
export const loadTimeline = (file: string): Timeline => JSON.parse(readFileSync(file, "utf8")) as Timeline;

/** How long each frame stays on screen: its real time, with waits cut after keep seconds and still moments between taps after still seconds. */
function cut({ frames, marks }: Timeline, keep: number, still: number) {
  const markAt = (at: number) => {
    const index = marks.reduce((found, mark, i) => (mark.at <= at ? i : found), -1);
    return { index, kind: marks[index]?.kind ?? "show" };
  };
  const shownInWait = new Map<number, number>();
  return frames.map((frame, i) => {
    const real = i + 1 < frames.length ? (frames[i + 1]?.at ?? frame.at) - frame.at : 2;
    const { index, kind } = markAt(frame.at);
    if (kind === "show") return { file: frame.file, seconds: real };
    if (kind === "act") return { file: frame.file, seconds: Math.min(real, still) };
    const used = shownInWait.get(index) ?? 0;
    const seconds = Math.max(0, Math.min(real, keep - used));
    shownInWait.set(index, used + seconds);
    return { file: frame.file, seconds };
  });
}

/** Writes the MP4 at normal speed, cutting waits shorter only as far as it must to stay under maxSeconds. */
export function encode(timeline: Timeline, maxSeconds: number, out: string, ffmpeg: string): { seconds: number; keep: number } {
  if (timeline.frames.length < 2) throw new Error("The screencast caught no frames.");
  let held = cut(timeline, 1.2, 0.4);
  let keep = 1.2;
  for (const [k, s] of [[0.9, 0.3], [0.6, 0.2], [0.4, 0.15]] as const) {
    if (held.reduce((sum, frame) => sum + frame.seconds, 0) <= maxSeconds) break;
    held = cut(timeline, k, s);
    keep = k;
  }
  const shown = held.filter((frame) => frame.seconds > 0.0005);
  const seconds = shown.reduce((sum, frame) => sum + frame.seconds, 0);
  const lines = shown.flatMap((frame) => [`file '${frame.file.replace(/\\/g, "/")}'`, `duration ${frame.seconds.toFixed(4)}`]);
  const list = `${out}.frames.txt`;
  writeFileSync(list, [...lines, `file '${shown.at(-1)?.file.replace(/\\/g, "/") ?? ""}'`, ""].join("\n"));
  const filters = "fps=30,scale=in_range=pc:out_range=tv,format=yuv420p";
  execFileSync(ffmpeg, ["-y", "-loglevel", "error", "-f", "concat", "-safe", "0", "-i", list, "-vf", filters, "-c:v", "libx264", "-preset", "slow", "-crf", "18", "-tune", "stillimage", "-movflags", "+faststart", "-an", out], { stdio: "inherit" });
  rmSync(list, { force: true });
  return { seconds, keep };
}
