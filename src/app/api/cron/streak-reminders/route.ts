import { NextRequest, NextResponse } from "next/server";
import { configured } from "@/lib/academy/groups-server";
import { runStreakReminders } from "@/lib/academy/streak-reminder";
import { reminderDeps, reminderMailConfig } from "@/lib/academy/streak-reminder-server";
import { cronAuthorized } from "@/lib/whats-new-email/send";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const BUDGET_MS = 50_000;

export async function GET(req: NextRequest): Promise<NextResponse> {
  if (!cronAuthorized(req.headers.get("authorization"), process.env.CRON_SECRET)) return new NextResponse("Not Found", { status: 404 });
  const deadline = Date.now() + BUDGET_MS;
  const config = reminderMailConfig();
  if ("missing" in config) return NextResponse.json({ error: "Streak email is not configured.", missing: config.missing }, { status: 503 });
  if (!configured()) return NextResponse.json({ error: "Supabase is not configured." }, { status: 503 });
  try {
    const report = await runStreakReminders(reminderDeps(config), { now: Date.now(), deadline });
    console.log("[streak-reminder] run", report);
    return NextResponse.json({ ok: true, ...report });
  } catch (err) {
    console.error("[streak-reminder] run failed:", err instanceof Error ? err.message : "unknown");
    return NextResponse.json({ error: "Reminder run failed." }, { status: 502 });
  }
}
