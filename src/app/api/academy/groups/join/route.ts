import type { NextRequest, NextResponse } from "next/server";
import { joinDecision, normalizeDisplayName, normalizeInviteCode } from "@/lib/academy/groups";
import {
  clientIp,
  configured,
  fail,
  groupByCode,
  joinLimited,
  GroupsError,
  json,
  limitError,
  MEMBERS,
  membersOf,
  membershipsOf,
  oneGroup,
  preflight,
  readBody,
  requestUser,
  service,
} from "@/lib/academy/groups-server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export function OPTIONS(): NextResponse {
  return preflight();
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  if (!configured()) return json({ error: "sync_unavailable" }, 503);
  const uid = await requestUser(req);
  if (!uid) return json({ error: "unauthorized" }, 401);
  if (joinLimited(`ip:${clientIp(req)}`) || joinLimited(`user:${uid}`)) return json({ error: "rate_limited" }, 429);
  const body = await readBody(req);
  const displayName = normalizeDisplayName(body?.displayName);
  if (!displayName || typeof body?.code !== "string") return json({ error: "bad_request" }, 400);
  const code = normalizeInviteCode(body.code);
  if (!code) return json({ error: "not_found" }, 404);
  try {
    const group = await groupByCode(code);
    if (!group) return json({ error: "not_found" }, 404);
    const [members, mine] = await Promise.all([membersOf([group.id]), membershipsOf(uid)]);
    const decision = joinDecision(group.kind, members, uid, mine.length);
    if (decision === "full") return json({ error: "group_full" }, 409);
    if (decision === "joined_limit") return json({ error: "joined_limit" }, 409);
    if (decision === "ok") {
      const res = await service().from(MEMBERS).insert({ group_id: group.id, user_id: uid, role: "member", display_name: displayName });
      if (res.error && !/duplicate key|unique/i.test(res.error.message)) {
        const limit = limitError(res.error.message);
        if (limit) throw limit;
        throw new GroupsError("write_failed", 500);
      }
    }
    return json({ group: await oneGroup(uid, group.id) });
  } catch (err) {
    return fail(err, "join");
  }
}
