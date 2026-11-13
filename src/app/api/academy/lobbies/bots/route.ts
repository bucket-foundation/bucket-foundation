import type { NextRequest, NextResponse } from "next/server";
import { json, preflight, service } from "@/lib/academy/groups-server";
import { botsEnabled, FILL_SEATS } from "@/lib/academy/lobby-bots";
import { fillLobby } from "@/lib/academy/lobby-bots-server";
import { authed, checkLobby, LOBBIES, LOBBY_COLS, lobbyFail, lobbyState, memberLobby, playersOf } from "@/lib/academy/lobbies-server";
import type { LobbyRow } from "@/lib/academy/lobbies";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export function OPTIONS(): NextResponse {
  return preflight();
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  const a = await authed(req);
  if (!("uid" in a)) return a;
  if (!botsEnabled()) return json({ error: "bots_off" }, 404);
  try {
    const lobby = await memberLobby(a.uid, a.body?.lobbyId);
    if (lobby.host_id !== a.uid) return json({ error: "not_host" }, 403);
    if (lobby.status !== "lobby") return json({ error: "lobby_started" }, 409);
    const rows = checkLobby(await service().from(LOBBIES).update({ bot_fill: true }).eq("id", lobby.id).eq("status", "lobby").select(LOBBY_COLS), "bot fill") as LobbyRow[];
    if (!rows[0]) return json({ error: "lobby_started" }, 409);
    await fillLobby(rows[0], await playersOf([lobby.id]), FILL_SEATS);
    return json({ lobby: await lobbyState(rows[0], a.uid, Date.now()) });
  } catch (err) {
    return lobbyFail(err, "bots");
  }
}
