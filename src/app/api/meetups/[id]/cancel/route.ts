import type { NextRequest, NextResponse } from "next/server";
import { configured, fail, json, preflight, requestUser, service } from "@/lib/academy/groups-server";
import { uuidOrNull } from "@/lib/academy/groups";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export function OPTIONS(): NextResponse {
  return preflight();
}
import { goingIds, meetupById, present, pushText } from "@/lib/polingual/meetups-server";

export async function POST(req: NextRequest, { params }: { params: { id: string } }): Promise<NextResponse> {
  if (!configured()) return json({ error: "sync_unavailable" }, 503);
  const uid = await requestUser(req);
  if (!uid) return json({ error: "unauthorized" }, 401);
  const id = uuidOrNull(params.id);
  if (!id) return json({ error: "bad_request" }, 400);
  try {
    const row = await meetupById(id);
    if (!row || row.host_id !== uid) return json({ error: "not_found" }, 404);
    if (!row.cancelled_at) {
      const res = await service().from("meetups").update({ cancelled_at: new Date().toISOString() }).eq("id", id).eq("host_id", uid).is("cancelled_at", null);
      if (res.error) throw new Error(`cancel: ${res.error.message}`);
      await pushText(await goingIds(id), `${row.title} was cancelled`, id).catch(() => undefined);
    }
    const fresh = await meetupById(id);
    const [meetup] = await present([fresh ?? row], uid);
    return json({ meetup });
  } catch (err) {
    return fail(err, "meetup cancel");
  }
}
