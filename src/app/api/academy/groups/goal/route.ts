import type { NextRequest, NextResponse } from "next/server";
import { normalizeWeeklyGoal, uuidOrNull, validTimeZone } from "@/lib/academy/groups";
import { configured, fail, groupById, GROUPS, json, oneGroup, preflight, readBody, requestUser, service } from "@/lib/academy/groups-server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export function OPTIONS(): NextResponse {
  return preflight();
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  if (!configured()) return json({ error: "sync_unavailable" }, 503);
  const uid = await requestUser(req);
  if (!uid) return json({ error: "unauthorized" }, 401);
  const body = await readBody(req);
  const groupId = uuidOrNull(body?.groupId);
  const weekly = normalizeWeeklyGoal(body?.weekly);
  if (!groupId || weekly === null) return json({ error: "bad_request" }, 400);
  try {
    const group = await groupById(groupId);
    if (!group) return json({ error: "not_found" }, 404);
    if (group.owner_id !== uid) return json({ error: "forbidden" }, 403);
    const res = await service().from(GROUPS).update({ weekly_goal: weekly }).eq("id", group.id);
    if (res.error) throw new Error(`goal update: ${res.error.message}`);
    const updated = await oneGroup(uid, group.id, validTimeZone(body?.tz));
    return json({ goal: updated.goal });
  } catch (err) {
    return fail(err, "goal");
  }
}
