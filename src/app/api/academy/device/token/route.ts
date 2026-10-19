import type { NextRequest } from "next/server";
import { deviceFlow, deviceSyncConfigured, deviceSyncEnabled, jsonResponse, readJson } from "@/lib/academy/device-server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest): Promise<Response> {
  if (!deviceSyncEnabled()) return jsonResponse({ error: "review_log_disabled" }, 503);
  if (!deviceSyncConfigured()) return jsonResponse({ error: "sync_unavailable" }, 503);
  try {
    const r = await deviceFlow.token(await readJson(req));
    return jsonResponse(r.body, r.status);
  } catch (e) {
    console.error("device token", e);
    return jsonResponse({ error: "token_failed" }, 500);
  }
}
