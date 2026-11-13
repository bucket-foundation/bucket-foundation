import type { NextRequest, NextResponse } from "next/server";
import { nameAllowed } from "@/lib/academy/groups-names";
import { normalizeDisplayName } from "@/lib/academy/groups";
import { clientIp, configured, json, NAME_NOT_ALLOWED, preflight, readBody } from "@/lib/academy/groups-server";
import { GUEST_PER_MINUTE, issueGuestToken, normalizeGuestId } from "@/lib/academy/lobby-guests";
import { guestSecret, limited, lobbyFail } from "@/lib/academy/lobbies-server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export function OPTIONS(): NextResponse {
  return preflight();
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  const secret = guestSecret();
  if (!configured() || !secret) return json({ error: "sync_unavailable" }, 503);
  const body = await readBody(req);
  const nickname = normalizeDisplayName(body?.nickname);
  const guestId = normalizeGuestId(body?.guestId);
  if (!nickname || !guestId) return json({ error: "bad_request" }, 400);
  if (!nameAllowed(nickname)) return json({ error: NAME_NOT_ALLOWED }, 422);
  try {
    if ((await limited(`guest:ip:${clientIp(req)}`, GUEST_PER_MINUTE * 4)) || (await limited(`guest:id:${guestId}`, GUEST_PER_MINUTE))) return json({ error: "rate_limited" }, 429);
    return json(issueGuestToken(guestId, nickname, secret, Date.now()));
  } catch (err) {
    return lobbyFail(err, "guest");
  }
}
