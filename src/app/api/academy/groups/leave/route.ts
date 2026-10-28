import type { NextRequest, NextResponse } from "next/server";
import { uuidOrNull } from "@/lib/academy/groups";
import { configured, fail, json, preflight, readBody, requestUser, service } from "@/lib/academy/groups-server";

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
    const res = await service().rpc("leave_group", { p_group: groupId, p_user: uid });
    if (res.error) throw new Error(`leave_group: ${res.error.message}`);
    if (res.data === "not_found" || res.data === "not_member") return json({ error: "not_found" }, 404);
    return json({ ok: true });
  } catch (err) {
    return fail(err, "leave");
  }
}
