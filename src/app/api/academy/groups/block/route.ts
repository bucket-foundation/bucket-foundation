import type { NextRequest, NextResponse } from "next/server";
import { toBlock, uuidOrNull } from "@/lib/academy/groups";
import { blocksTouching, configured, fail, groupById, json, membersOf, preflight, readBody, requestUser, service } from "@/lib/academy/groups-server";

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
    const mine = (await blocksTouching(uid)).filter((b) => b.blocker_id === uid);
    return json({ blocks: mine.map(toBlock) });
  } catch (err) {
    return fail(err, "blocks");
  }
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  if (!configured()) return json({ error: "sync_unavailable" }, 503);
  const uid = await requestUser(req);
  if (!uid) return json({ error: "unauthorized" }, 401);
  const body = await readBody(req);
  const groupId = uuidOrNull(body?.groupId);
  const target = body?.userId === undefined ? null : uuidOrNull(body.userId);
  if (!groupId || (body?.userId !== undefined && !target) || target === uid) return json({ error: "bad_request" }, 400);
  try {
    const [group, members] = await Promise.all([groupById(groupId), membersOf([groupId])]);
    if (!group || !members.some((m) => m.user_id === uid)) return json({ error: "not_found" }, 404);
    if (target) {
      const member = members.find((m) => m.user_id === target);
      if (!member) return json({ error: "not_found" }, 404);
      const res = await service().rpc("block_member", { p_blocker: uid, p_target: target, p_name: member.display_name });
      if (res.error) throw new Error(`block_member: ${res.error.message}`);
      return json({ ok: true });
    }
    if (group.owner_id === uid) return json({ error: "bad_request" }, 400);
    const res = await service().rpc("block_group", { p_blocker: uid, p_group: groupId, p_name: group.name });
    if (res.error) throw new Error(`block_group: ${res.error.message}`);
    return json({ ok: true });
  } catch (err) {
    return fail(err, "block");
  }
}
