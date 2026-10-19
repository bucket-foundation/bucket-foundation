import type { NextRequest } from "next/server";
import { deviceSyncConfigured, jsonResponse, listDevices, requestUser, serverVerifyDevice } from "@/lib/academy/device-server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest): Promise<Response> {
  if (!deviceSyncConfigured()) return jsonResponse({ error: "sync_unavailable" }, 503);
  const uid = await requestUser(req);
  if (!uid) return jsonResponse({ error: "unauthorized" }, 401);
  const device = await serverVerifyDevice(req, uid, "");
  if (!device.ok) return jsonResponse({ error: "device_refused", reason: device.reason }, 401);
  try {
    return jsonResponse({ devices: await listDevices(uid) });
  } catch (e) {
    console.error("device list", e);
    return jsonResponse({ error: "read_failed" }, 500);
  }
}
