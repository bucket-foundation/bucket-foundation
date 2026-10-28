import type { NextRequest, NextResponse } from "next/server";
import { normalizeBundleId, normalizeDeviceToken, normalizePushEnv } from "@/lib/academy/apns";
import { configured, fail, json, preflight, readBody, requestUser } from "@/lib/academy/groups-server";
import { registerDevice, unregisterDevice } from "@/lib/academy/push-server";

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
  const token = normalizeDeviceToken(body?.token);
  const env = normalizePushEnv(body?.env);
  const bundleId = normalizeBundleId(body?.bundleId);
  if (!token || !env || !bundleId) return json({ error: "bad_request" }, 400);
  try {
    await registerDevice(uid, token, env, bundleId);
    return json({ ok: true });
  } catch (err) {
    return fail(err, "push register");
  }
}

export async function DELETE(req: NextRequest): Promise<NextResponse> {
  if (!configured()) return json({ error: "sync_unavailable" }, 503);
  const uid = await requestUser(req);
  if (!uid) return json({ error: "unauthorized" }, 401);
  const body = await readBody(req);
  const token = normalizeDeviceToken(body?.token);
  if (!token) return json({ error: "bad_request" }, 400);
  try {
    await unregisterDevice(uid, token);
    return json({ ok: true });
  } catch (err) {
    return fail(err, "push unregister");
  }
}
