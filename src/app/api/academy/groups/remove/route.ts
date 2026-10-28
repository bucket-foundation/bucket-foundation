import type { NextRequest, NextResponse } from "next/server";
import { removeDecision, uuidOrNull } from "@/lib/academy/groups";
import { configured, fail, groupById, json, MEMBERS, membersOf, preflight, readBody, requestUser, service } from "@/lib/academy/groups-server";

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
  const target = uuidOrNull(body?.userId);
  if (!groupId || !target) return json({ error: "bad_request" }, 400);
  try {
    const group = await groupById(groupId);
    if (!group) return json({ error: "not_found" }, 404);
    const members = await membersOf([group.id]);
    if (!members.some((m) => m.user_id === uid)) return json({ error: "not_found" }, 404);
    const decision = removeDecision(members, group.owner_id, uid, target);
    if (decision === "forbidden") return json({ error: "forbidden" }, 403);
    if (decision === "self") return json({ error: "bad_request" }, 400);
    if (decision === "not_member") return json({ error: "not_found" }, 404);
    const res = await service().from(MEMBERS).delete().eq("group_id", group.id).eq("user_id", target);
    if (res.error) throw new Error(`member remove: ${res.error.message}`);
    return json({ ok: true });
  } catch (err) {
    return fail(err, "remove");
  }
}
