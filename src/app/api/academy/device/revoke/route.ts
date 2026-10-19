import type { NextRequest } from "next/server";
import { deviceFlow, deviceSyncConfigured, jsonResponse, requestAccessToken, requestUser, serverVerifyDevice } from "@/lib/academy/device-server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest): Promise<Response> {
  if (!deviceSyncConfigured()) return jsonResponse({ error: "sync_unavailable" }, 503);
  const text = await req.text().catch(() => "");
  const uid = await requestUser(req);
  if (!uid) return jsonResponse({ error: "unauthorized" }, 401);
  const device = await serverVerifyDevice(req, uid, text);
  if (!device.ok) return jsonResponse({ error: "device_refused", reason: device.reason }, 401);
  let body: unknown;
  try {
    body = JSON.parse(text);
  } catch {
    return jsonResponse({ error: "bad_request" }, 400);
  }
  try {
    const r = await deviceFlow.revoke(uid, await requestAccessToken(req), body);
    return jsonResponse(r.body, r.status);
  } catch (e) {
    console.error("device revoke", e);
    return jsonResponse({ error: "revoke_failed" }, 500);
  }
}
