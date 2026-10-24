import "server-only";
import { NextResponse } from "next/server";
import { log } from "./log";

/** An error that is safe to show the user. Anything else becomes a generic 500. */
export class AppError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    readonly publicMessage: string,
  ) {
    super(code);
  }
}

export function toErrorResponse(error: unknown, route: string): NextResponse {
  if (error instanceof AppError) {
    log("warn", "request_rejected", { route, code: error.code, status: error.status });
    return NextResponse.json({ error: error.code, message: error.publicMessage }, { status: error.status });
  }
  log("error", "request_failed", { route, message: error instanceof Error ? error.message : "unknown" });
  return NextResponse.json({ error: "server_error", message: "Something went wrong on our side. Try again in a minute." }, { status: 500 });
}
