import type { NextRequest, NextResponse } from "next/server";
import { uuidOrNull } from "@/lib/academy/groups";
import { BLOCKS, configured, fail, json, preflight, readBody, requestUser, service } from "@/lib/academy/groups-server";

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
  const blockId = uuidOrNull(body?.blockId);
  if (!blockId) return json({ error: "bad_request" }, 400);
  try {
    const res = await service().from(BLOCKS).delete().eq("id", blockId).eq("blocker_id", uid);
    if (res.error) throw new Error(`unblock: ${res.error.message}`);
    return json({ ok: true });
  } catch (err) {
    return fail(err, "unblock");
  }
}
