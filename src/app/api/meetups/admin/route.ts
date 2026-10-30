import type { NextRequest, NextResponse } from "next/server";
import { configured, fail, json, preflight, readBody, requestUser, service } from "@/lib/academy/groups-server";
import { uuidOrNull } from "@/lib/academy/groups";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export function OPTIONS(): NextResponse {
  return preflight();
}
import { adminIds, goingIds, meetupById, MEETUP_COLS, present, pushText } from "@/lib/polingual/meetups-server";
import type { MeetupRow } from "@/lib/polingual/meetups";

async function admin(req: NextRequest): Promise<string | null> {
  const uid = await requestUser(req);
  return uid && adminIds().has(uid) ? uid : null;
}

export async function GET(req: NextRequest): Promise<NextResponse> {
  if (!configured()) return json({ error: "sync_unavailable" }, 503);
  const uid = await admin(req);
  if (!uid) return json({ error: "not_found" }, 404);
  try {
    const reports = await service().from("meetup_reports").select("meetup_id,reason,note,created_at").eq("status", "open").order("created_at", { ascending: false }).limit(100);
    if (reports.error) throw new Error(`admin reports: ${reports.error.message}`);
    const list = (reports.data ?? []) as { meetup_id: string; reason: string; note: string; created_at: string }[];
    const ids = Array.from(new Set(list.map((r) => r.meetup_id)));
    const rows = ids.length ? await service().from("meetups").select(MEETUP_COLS).in("id", ids) : { data: [], error: null };
    if (rows.error) throw new Error(`admin meetups: ${rows.error.message}`);
    const meetups = await present((rows.data ?? []) as MeetupRow[], uid);
    return json({ reports: list.map((r) => ({ meetupId: r.meetup_id, reason: r.reason, note: r.note, createdAt: r.created_at })), meetups });
  } catch (err) {
    return fail(err, "meetup admin");
  }
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  if (!configured()) return json({ error: "sync_unavailable" }, 503);
  const uid = await admin(req);
  if (!uid) return json({ error: "not_found" }, 404);
  const body = await readBody(req);
  const id = uuidOrNull(body?.meetupId);
  const action = body?.action === "takedown" || body?.action === "dismiss" ? body.action : null;
  if (!id || !action) return json({ error: "bad_request" }, 400);
  try {
    const now = new Date().toISOString();
    if (action === "takedown") {
      const t = await service().from("meetups").update({ taken_down_at: now }).eq("id", id);
      if (t.error) throw new Error(`takedown: ${t.error.message}`);
      const row = await meetupById(id);
      if (row) await pushText(await goingIds(id), `${row.title} was cancelled`, id).catch(() => undefined);
    }
    const r = await service().from("meetup_reports").update({ status: action === "takedown" ? "actioned" : "dismissed", reviewed_at: now }).eq("meetup_id", id).eq("status", "open");
    if (r.error) throw new Error(`review: ${r.error.message}`);
    return json({ ok: true });
  } catch (err) {
    return fail(err, "meetup admin action");
  }
}
