import { NextResponse } from "next/server";
import { configStatus, emulatorsOn } from "@/server/env";

export const dynamic = "force-dynamic";

/**
 * Confirms the deployed app and its settings without exposing any value. Check
 * it after every deploy: every integration true, and emulators false.
 */
export function GET() {
  return NextResponse.json({ status: "ok", configured: configStatus(), emulators: emulatorsOn(), at: new Date().toISOString() });
}
