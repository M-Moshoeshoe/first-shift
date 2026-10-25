import { NextResponse } from "next/server";
import { configStatus, emulatorsOn } from "@/server/env";
import { adminChecks, runLiveChecks, type LiveChecks } from "@/server/liveChecks";

export const dynamic = "force-dynamic";

// The live checks cost a Firestore read and a Storage call, and this route is public: run them at most once a minute.
const CACHE_MS = 60_000;
let cached: { at: number; checks: LiveChecks } | null = null;

/**
 * Confirms the deployed app works, without exposing any value. configured
 * says which settings are present; live says whether each service really
 * answered (server/liveChecks.ts). Anything false answers 503, so a broken
 * service can never look healthy. Check it after every deploy: everything
 * true, and emulators false.
 */
export async function GET() {
  if (!cached || Date.now() - cached.at > CACHE_MS) cached = { at: Date.now(), checks: await runLiveChecks(adminChecks) };
  const configured = configStatus();
  const healthy = Object.values(configured).every(Boolean) && Object.values(cached.checks).every(Boolean);
  return NextResponse.json(
    { status: healthy ? "ok" : "degraded", configured, live: cached.checks, emulators: emulatorsOn(), at: new Date().toISOString() },
    { status: healthy ? 200 : 503, headers: { "cache-control": "no-store" } },
  );
}
