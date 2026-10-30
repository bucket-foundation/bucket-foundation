import type { NextRequest, NextResponse } from "next/server";
import { configured, fail, json, preflight, requestUser } from "@/lib/academy/groups-server";
import { uuidOrNull } from "@/lib/academy/groups";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export function OPTIONS(): NextResponse {
  return preflight();
}
import { adminIds, blockedFor, meetupById, present } from "@/lib/polingual/meetups-server";

export async function GET(req: NextRequest, { params }: { params: { id: string } }): Promise<NextResponse> {
  if (!configured()) return json({ error: "sync_unavailable" }, 503);
  const id = uuidOrNull(params.id);
  if (!id) return json({ error: "not_found" }, 404);
  const uid = await requestUser(req);
  try {
    const row = await meetupById(id);
    if (!row || row.host_id === null || (await blockedFor(uid)).has(row.host_id)) return json({ error: "not_found" }, 404);
    const admin = uid !== null && adminIds().has(uid);
    const [meetup] = await present([row], uid, admin);
    if ((meetup.status === "under_review" || row.taken_down_at) && !meetup.isHost && !admin) return json({ error: "not_found" }, 404);
    return json({ meetup });
  } catch (err) {
    return fail(err, "meetup");
  }
}
