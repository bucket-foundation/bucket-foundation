import type { NextRequest, NextResponse } from "next/server";
import { configured, fail, json, preflight, readBody, requestUser, service } from "@/lib/academy/groups-server";
import { uuidOrNull } from "@/lib/academy/groups";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export function OPTIONS(): NextResponse {
  return preflight();
}
import { meetupById } from "@/lib/polingual/meetups-server";

export async function POST(req: NextRequest): Promise<NextResponse> {
  if (!configured()) return json({ error: "sync_unavailable" }, 503);
  const uid = await requestUser(req);
  if (!uid) return json({ error: "unauthorized" }, 401);
  const body = await readBody(req);
  const meetupId = uuidOrNull(body?.meetupId);
  if (!meetupId) return json({ error: "bad_request" }, 400);
  try {
    const row = await meetupById(meetupId);
    if (!row || !row.host_id) return json({ error: "not_found" }, 404);
    if (row.host_id === uid) return json({ error: "bad_request" }, 400);
    const res = await service().from("meetup_blocks").upsert({ user_id: uid, blocked_id: row.host_id }, { onConflict: "user_id,blocked_id" });
    if (res.error) throw new Error(`block: ${res.error.message}`);
    await service().from("meetup_rsvps").delete().eq("user_id", uid).in("meetup_id",
      ((await service().from("meetups").select("id").eq("host_id", row.host_id)).data ?? []).map((m: { id: string }) => m.id));
    return json({ ok: true });
  } catch (err) {
    return fail(err, "meetup block");
  }
}
