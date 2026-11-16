import type { NextRequest, NextResponse } from "next/server";
import { json, preflight } from "@/lib/academy/groups-server";
import { nameAllowed } from "@/lib/academy/groups-names";
import { service } from "@/lib/academy/groups-server";
import { CHAT_PER_MINUTE, normalizeMessage } from "@/lib/academy/lobbies";
import { authed, checkLobby, limited, lobbyFail, lobbyState, memberLobby, MESSAGES } from "@/lib/academy/lobbies-server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export function OPTIONS(): NextResponse {
  return preflight();
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  const a = await authed(req);
  if (!("uid" in a)) return a;
  const body = normalizeMessage(a.body?.body);
  if (!body) return json({ error: "bad_request" }, 400);
  if (!nameAllowed(body)) return json({ error: "text_not_allowed" }, 422);
  try {
    const lobby = await memberLobby(a.uid, a.body?.lobbyId);
    if (await limited(`chat:user:${a.uid}`, CHAT_PER_MINUTE)) return json({ error: "rate_limited" }, 429);
    checkLobby(await service().from(MESSAGES).insert({ lobby_id: lobby.id, user_id: a.uid, body }), "chat");
    return json({ lobby: await lobbyState(lobby, a.uid, Date.now()) });
  } catch (err) {
    return lobbyFail(err, "chat");
  }
}
