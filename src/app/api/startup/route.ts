/**
 * This route auto-initializes the dev scheduler on first request.
 * Next.js doesn't have a true "server startup" hook in app router,
 * so we trigger this from a layout fetch or middleware.
 */
import { NextResponse } from "next/server";

let initialized = false;

export async function GET() {
  if (!initialized && process.env.NODE_ENV === "development") {
    initialized = true;
    const { startDevScheduler } = await import("@/lib/dev-scheduler");
    startDevScheduler();
  }
  return NextResponse.json({ ok: true });
}
