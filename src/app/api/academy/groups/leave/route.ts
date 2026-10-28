import type { NextRequest, NextResponse } from "next/server";
import { leavePlan, uuidOrNull } from "@/lib/academy/groups";
import { configured, fail, groupById, GROUPS, json, MEMBERS, membersOf, preflight, readBody, requestUser, service } from "@/lib/academy/groups-server";

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
  if (!groupId) return json({ error: "bad_request" }, 400);
  try {
    const group = await groupById(groupId);
    if (!group) return json({ error: "not_found" }, 404);
    const plan = leavePlan(await membersOf([group.id]), group.owner_id, uid);
    if (plan.action === "not_member") return json({ error: "not_found" }, 404);
    if (plan.action === "delete") {
      const res = await service().from(GROUPS).delete().eq("id", group.id);
      if (res.error) throw new Error(`group delete: ${res.error.message}`);
      return json({ ok: true });
    }
    if (plan.newOwner) {
      const owner = await service().from(GROUPS).update({ owner_id: plan.newOwner }).eq("id", group.id);
      if (owner.error) throw new Error(`owner transfer: ${owner.error.message}`);
      const role = await service().from(MEMBERS).update({ role: "owner" }).eq("group_id", group.id).eq("user_id", plan.newOwner);
      if (role.error) throw new Error(`owner role: ${role.error.message}`);
    }
    const res = await service().from(MEMBERS).delete().eq("group_id", group.id).eq("user_id", uid);
    if (res.error) throw new Error(`member delete: ${res.error.message}`);
    return json({ ok: true });
  } catch (err) {
    return fail(err, "leave");
  }
}
