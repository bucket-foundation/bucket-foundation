import type { NextRequest, NextResponse } from "next/server";
import { configured, json, preflight, readBody, requestUser, service } from "@/lib/academy/groups-server";
import { verifyGuestToken } from "@/lib/academy/lobby-guests";
import { guestSecret, lobbyFail } from "@/lib/academy/lobbies-server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export function OPTIONS(): NextResponse {
  return preflight();
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  const secret = guestSecret();
  if (!configured() || !secret) return json({ error: "sync_unavailable" }, 503);
  const uid = await requestUser(req);
  if (!uid) return json({ error: "unauthorized" }, 401);
  const body = await readBody(req);
  const claims = typeof body?.guestToken === "string" ? verifyGuestToken(body.guestToken, secret, Date.now()) : null;
  if (!claims) return json({ error: "bad_guest" }, 400);
  try {
    const res = await service().rpc("merge_lobby_guest", { p_guest: claims.sub, p_user: uid });
    if (res.error) throw new Error(res.error.message);
    return json({ ok: true, merged: res.data ?? 0 });
  } catch (err) {
    return lobbyFail(err, "merge");
  }
}
