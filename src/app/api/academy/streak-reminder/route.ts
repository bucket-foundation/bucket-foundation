import type { NextRequest, NextResponse } from "next/server";
import { configured, fail, json, preflight, readBody, requestUser } from "@/lib/academy/groups-server";
import { validTimeZone } from "@/lib/academy/groups";
import { disableReminders, enableReminders, isAdult, reminderStatus } from "@/lib/academy/streak-reminder-server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export function OPTIONS(): NextResponse {
  return preflight();
}

export async function GET(req: NextRequest): Promise<NextResponse> {
  if (!configured()) return json({ error: "sync_unavailable" }, 503);
  const uid = await requestUser(req);
  if (!uid) return json({ error: "unauthorized" }, 401);
  try {
    return json(await reminderStatus(uid));
  } catch (err) {
    return fail(err, "streak reminder read");
  }
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  if (!configured()) return json({ error: "sync_unavailable" }, 503);
  const uid = await requestUser(req);
  if (!uid) return json({ error: "unauthorized" }, 401);
  const body = await readBody(req);
  if (typeof body?.enabled !== "boolean") return json({ error: "bad_request" }, 400);
  try {
    if (!body.enabled) {
      await disableReminders(uid);
      return json({ ok: true, enabled: false });
    }
    const tz = validTimeZone(body.tz);
    if (!tz) return json({ error: "bad_request" }, 400);
    if (!(await isAdult(uid))) return json({ error: "adults_only" }, 403);
    await enableReminders(uid, tz);
    return json({ ok: true, enabled: true });
  } catch (err) {
    return fail(err, "streak reminder write");
  }
}
