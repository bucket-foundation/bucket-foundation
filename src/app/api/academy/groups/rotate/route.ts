import type { NextRequest, NextResponse } from "next/server";
import { uuidOrNull } from "@/lib/academy/groups";
import { configured, fail, groupById, json, preflight, readBody, requestUser, rotateCode } from "@/lib/academy/groups-server";

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
    if (group.owner_id !== uid) return json({ error: "forbidden" }, 403);
    return json({ code: await rotateCode(group.id) });
  } catch (err) {
    return fail(err, "rotate");
  }
}
