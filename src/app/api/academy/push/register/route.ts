import type { NextRequest, NextResponse } from "next/server";
import { normalizeAnyToken, parseRegistration } from "@/lib/academy/apns";
import { configured, fail, json, preflight, readBody, requestUser } from "@/lib/academy/groups-server";
import { registerDevice, registerFcmDevice, unregisterDevice } from "@/lib/academy/push-server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export function OPTIONS(): NextResponse {
  return preflight();
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  if (!configured()) return json({ error: "sync_unavailable" }, 503);
  const uid = await requestUser(req);
  if (!uid) return json({ error: "unauthorized" }, 401);
  const reg = parseRegistration(await readBody(req));
  if (!reg) return json({ error: "bad_request" }, 400);
  try {
    if (reg.platform === "android") await registerFcmDevice(uid, reg.token, reg.bundleId);
    else await registerDevice(uid, reg.token, reg.env, reg.bundleId);
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
  const any = normalizeAnyToken(body?.token);
  if (!any) return json({ error: "bad_request" }, 400);
  try {
    await unregisterDevice(uid, any.token, any.platform);
    return json({ ok: true });
  } catch (err) {
    return fail(err, "push unregister");
  }
}
