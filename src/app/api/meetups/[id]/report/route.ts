import type { NextRequest, NextResponse } from "next/server";
import { configured, fail, json, preflight, readBody, requestUser, service } from "@/lib/academy/groups-server";
import { uuidOrNull } from "@/lib/academy/groups";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export function OPTIONS(): NextResponse {
  return preflight();
}
import { REPORT_REASONS, rejectedContent, type ReportReason } from "@/lib/polingual/meetups";
import { adminIds, meetupById, pushText } from "@/lib/polingual/meetups-server";

export async function POST(req: NextRequest, { params }: { params: { id: string } }): Promise<NextResponse> {
  if (!configured()) return json({ error: "sync_unavailable" }, 503);
  const uid = await requestUser(req);
  if (!uid) return json({ error: "unauthorized" }, 401);
  const id = uuidOrNull(params.id);
  const body = await readBody(req);
  const reason = REPORT_REASONS.find((r) => r === body?.reason) as ReportReason | undefined;
  const note = typeof body?.note === "string" ? body.note.trim().slice(0, 300) : "";
  if (!id || !reason) return json({ error: "bad_request" }, 400);
  try {
    const res = await service().rpc("report_meetup", { p_meetup: id, p_user: uid, p_reason: reason, p_note: rejectedContent(note) ? "" : note });
    if (res.error) throw new Error(`report_meetup: ${res.error.message}`);
    const out = String(res.data);
    if (out === "not_found") return json({ error: out }, 404);
    if (out === "report_limit") return json({ error: out }, 429);
    if (out === "first") {
      const row = await meetupById(id);
      await pushText(Array.from(adminIds()), `Meetup reported (${reason}): ${row?.title ?? id}`, id).catch(() => undefined);
    }
    return json({ ok: true });
  } catch (err) {
    return fail(err, "meetup report");
  }
}
