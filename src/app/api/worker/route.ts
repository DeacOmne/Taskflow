/**
 * Dev-mode scheduler trigger endpoint.
 * In production, use the separate worker process instead.
 *
 * This also serves as a webhook endpoint that can be called by
 * external cron services (e.g., Vercel Cron, cron-job.org).
 *
 * Protect it with a CRON_SECRET env var in production.
 */
import { NextRequest, NextResponse } from "next/server";
import { processSchedules } from "@/lib/scheduler";

export async function POST(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const authHeader = req.headers.get("authorization");
    if (authHeader !== `Bearer ${secret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  try {
    await processSchedules();
    return NextResponse.json({ ok: true, ran: true });
  } catch (err) {
    console.error("[Worker API] Error:", err);
    return NextResponse.json({ error: "Scheduler error" }, { status: 500 });
  }
}

// Also support GET for Vercel Cron
export async function GET(req: NextRequest) {
  return POST(req);
}
