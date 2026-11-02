import type { NextRequest, NextResponse } from "next/server";
import { memberGraph, uuidOrNull } from "@/lib/academy/groups";
import { configured, fail, json, lookup, membersOf, preflight, progressRows, requestUser, words } from "@/lib/academy/groups-server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export function OPTIONS(): NextResponse {
  return preflight();
}

export async function GET(req: NextRequest): Promise<NextResponse> {
  if (!configured()) return json({ error: "sync_unavailable" }, 503);
  const uid = await requestUser(req);
  if (!uid) return json({ error: "unauthorized" }, 401);
  const q = new URL(req.url).searchParams;
  const groupId = uuidOrNull(q.get("groupId"));
  const target = uuidOrNull(q.get("userId"));
  const branch = (q.get("branch") ?? "").trim();
  if (!groupId || !target || !/^[A-Za-z0-9][A-Za-z0-9._-]{0,63}$/.test(branch)) return json({ error: "bad_request" }, 400);
  try {
    const members = await membersOf([groupId]);
    if (!members.some((m) => m.user_id === uid) || !members.some((m) => m.user_id === target)) return json({ error: "not_found" }, 404);
    const graph = memberGraph(await progressRows([target]), branch, lookup, words);
    if (!graph) return json({ error: "not_found" }, 404);
    return json(graph);
  } catch (err) {
    return fail(err, "member");
  }
}
