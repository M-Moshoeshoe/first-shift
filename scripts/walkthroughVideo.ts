import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type { CDPSession, Page } from "playwright-core";

/**
 * The walkthrough's video, at full quality: every frame the screen paints,
 * from Chrome's own screencast at the page's 2x pixels as near-lossless
 * JPEGs, then encoded once with ffmpeg as H.264 (CRF 18). Playwright's own
 * recorder is low-bitrate VP8, which blurs text. Tools only.
 */
interface Frame {
  file: string;
  at: number;
}

/** From this moment on, the video plays at this speed (walkthrough.ts, pace). */
export interface PaceMark {
  at: number;
  speed: number;
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

/** Everything encode needs, saved beside the frames, so the video can be encoded again with other paces without a new run. */
export interface Timeline {
  frames: Frame[];
  marks: PaceMark[];
  /** When the title card ends: it always plays at its own length. */
  titleUntil: number;
}

export const saveTimeline = (file: string, timeline: Timeline) => writeFileSync(file, JSON.stringify(timeline));
export const loadTimeline = (file: string): Timeline => JSON.parse(readFileSync(file, "utf8")) as Timeline;

/**
 * Writes the MP4: each frame held until the next one painted (the last for
 * two seconds), at the pace marked for its moment. Only if the result is
 * still over maxSeconds is everything after the title card sped up evenly
 * by the factor needed.
 */
export function encode({ frames, marks, titleUntil }: Timeline, maxSeconds: number, out: string, ffmpeg: string): { seconds: number; speed: number } {
  if (frames.length < 2) throw new Error("The screencast caught no frames.");
  const paceAt = (at: number) => marks.filter((mark) => mark.at <= at).at(-1)?.speed ?? 1;
  const held = frames.map((frame, index) => ({ ...frame, title: frame.at < titleUntil, seconds: (index + 1 < frames.length ? (frames[index + 1]?.at ?? frame.at) - frame.at : 2) / paceAt(frame.at) }));
  const title = held.filter((frame) => frame.title).reduce((sum, frame) => sum + frame.seconds, 0);
  const total = held.reduce((sum, frame) => sum + frame.seconds, 0);
  const speed = Math.max(1, (total - title) / (maxSeconds - title));
  const byPace = new Map<number, number>();
  for (const frame of held) byPace.set(paceAt(frame.at), (byPace.get(paceAt(frame.at)) ?? 0) + frame.seconds);
  console.log(`seconds by pace, before any even speed-up: ${[...byPace].map(([pace, seconds]) => `${pace}x ${seconds.toFixed(1)}`).join(", ")}`);
  const lines = held.flatMap((frame) => [`file '${frame.file.replace(/\\/g, "/")}'`, `duration ${Math.max(frame.title ? frame.seconds : frame.seconds / speed, 0.001).toFixed(4)}`]);
  const last = held.at(-1)?.file.replace(/\\/g, "/") ?? "";
  const list = `${out}.frames.txt`;
  writeFileSync(list, [...lines, `file '${last}'`, ""].join("\n"));
  execFileSync(ffmpeg, ["-y", "-loglevel", "error", "-f", "concat", "-safe", "0", "-i", list, "-vf", "fps=30,format=yuv420p", "-c:v", "libx264", "-preset", "slow", "-crf", "18", "-tune", "stillimage", "-movflags", "+faststart", "-an", out], { stdio: "inherit" });
  rmSync(list, { force: true });
  return { seconds: title + (total - title) / speed, speed };
}
