import type { NextRequest, NextResponse } from "next/server";
import { json, preflight } from "@/lib/academy/groups-server";
import { endEnabled } from "@/lib/academy/lobbies";
import { authed, closeLobbies, lobbyById, lobbyFail, lobbyState, memberLobby } from "@/lib/academy/lobbies-server";
import { purgeRounds } from "@/lib/academy/lobby-rooms-server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export function OPTIONS(): NextResponse {
  return preflight();
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  const a = await authed(req);
  if (!("uid" in a)) return a;
  if (!endEnabled()) return json({ error: "end_off" }, 404);
  try {
    const lobby = await memberLobby(a.uid, a.body?.lobbyId, false, true);
    if (lobby.host_id !== a.uid) return json({ error: "not_host" }, 403);
    if (lobby.standing_slot || lobby.ended_at) return json({ error: "lobby_started" }, 409);
    const now = Date.now();
    await closeLobbies([lobby.id], now);
    await purgeRounds(now, lobby.id);
    return json({ lobby: await lobbyState((await lobbyById(lobby.id)) ?? lobby, a.uid, now) });
  } catch (err) {
    return lobbyFail(err, "end");
  }
}
