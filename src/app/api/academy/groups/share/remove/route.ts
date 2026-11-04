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
  const itemId = uuidOrNull(body?.itemId);
  if (!itemId) return json({ error: "bad_request" }, 400);
  try {
    const res = await service().rpc("remove_shared_item", { p_item: itemId, p_user: uid });
    if (res.error) throw new Error(`remove_shared_item: ${res.error.message}`);
    if (res.data !== true) return json({ error: "not_found" }, 404);
    return json({ ok: true });
  } catch (err) {
    return fail(err, "share remove");
  }
}
