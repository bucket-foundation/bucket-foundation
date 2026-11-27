import type { NextRequest, NextResponse } from "next/server";
import { uuidOrNull } from "@/lib/academy/groups";
import { configured, fail, groupById, json, membersOf, preflight, requestUser, service } from "@/lib/academy/groups-server";
import { familyQuest, ROOMS_BRANCH } from "@/lib/academy/family-quest";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export function OPTIONS(): NextResponse {
  return preflight();
}

export async function GET(req: NextRequest): Promise<NextResponse> {
  if (!configured()) return json({ error: "sync_unavailable" }, 503);
  const uid = await requestUser(req);
  if (!uid) return json({ error: "unauthorized" }, 401);
  const groupId = uuidOrNull(new URL(req.url).searchParams.get("groupId"));
  if (!groupId) return json({ error: "bad_request" }, 400);
  try {
    const group = await groupById(groupId);
    if (!group) return json({ error: "not_found" }, 404);
    const members = await membersOf([group.id]);
    if (!members.some((m) => m.user_id === uid)) return json({ error: "not_found" }, 404);
    const res = await service().from("academy_progress").select("user_id,data").eq("branch", ROOMS_BRANCH).in("user_id", members.map((m) => m.user_id));
    if (res.error) throw new Error(`quest read: ${res.error.message}`);
    const quest = familyQuest((res.data ?? []) as { user_id: string; data: unknown }[], Date.now());
    const names = new Map(members.map((m) => [m.user_id, m.display_name]));
    const board = Object.entries(quest.xp).map(([id, xp]) => ({ name: names.get(id) ?? "Player", xp, me: id === uid })).sort((a, b) => b.xp - a.xp);
    return json({ quest: { goal: quest.goal, done: quest.done, weekStart: quest.weekStart }, board, group: { id: group.id, name: group.name, kind: group.kind } });
  } catch (err) {
    return fail(err, "quest");
  }
}
