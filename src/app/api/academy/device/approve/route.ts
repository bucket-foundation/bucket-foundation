import type { NextRequest } from "next/server";
import { deviceFlow, deviceSyncConfigured, deviceSyncEnabled, jsonResponse, readJson, requestUser } from "@/lib/academy/device-server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest): Promise<Response> {
  if (!deviceSyncEnabled()) return jsonResponse({ error: "review_log_disabled" }, 503);
  if (!deviceSyncConfigured()) return jsonResponse({ error: "sync_unavailable" }, 503);
  const uid = await requestUser(req);
  if (!uid) return jsonResponse({ error: "unauthorized" }, 401);
  try {
    const r = await deviceFlow.peek(new URL(req.url).searchParams.get("user_code"));
    return jsonResponse(r.body, r.status);
  } catch (e) {
    console.error("device peek", e);
    return jsonResponse({ error: "peek_failed" }, 500);
  }
}

export async function POST(req: NextRequest): Promise<Response> {
  if (!deviceSyncEnabled()) return jsonResponse({ error: "review_log_disabled" }, 503);
  if (!deviceSyncConfigured()) return jsonResponse({ error: "sync_unavailable" }, 503);
  const uid = await requestUser(req);
  if (!uid) return jsonResponse({ error: "unauthorized" }, 401);
  try {
    const r = await deviceFlow.approve(uid, await readJson(req));
    return jsonResponse(r.body, r.status);
  } catch (e) {
    console.error("device approve", e);
    return jsonResponse({ error: "approve_failed" }, 500);
  }
}
