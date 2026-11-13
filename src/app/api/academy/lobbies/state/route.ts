import type { NextRequest, NextResponse } from "next/server";
import { json, preflight } from "@/lib/academy/groups-server";
import { service } from "@/lib/academy/groups-server";
import { SEEN_EVERY_MS } from "@/lib/academy/lobbies";
import { tickLobby } from "@/lib/academy/lobby-bots-server";
import { authed, checkLobby, lobbyFail, lobbyState, memberLobby, PLAYERS, settle } from "@/lib/academy/lobbies-server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export function OPTIONS(): NextResponse {
  return preflight();
}

export async function GET(req: NextRequest): Promise<NextResponse> {
  const a = await authed(req, false);
  if (!("uid" in a)) return a;
  const params = new URL(req.url).searchParams;
  const since = Number(params.get("since") ?? "-1");
  try {
    const now = Date.now();
    const lobby = await settle(await tickLobby(await memberLobby(a.uid, params.get("lobbyId")), now), now);
    checkLobby(await service().from(PLAYERS).update({ last_seen: new Date(now).toISOString() }).eq("lobby_id", lobby.id).eq("user_id", a.uid).lt("last_seen", new Date(now - SEEN_EVERY_MS).toISOString()), "seen");
    if (lobby.status !== "playing" && Number.isFinite(since) && since === lobby.version) return json({ changed: false, version: lobby.version, now: new Date(now).toISOString() });
    return json({ changed: true, lobby: await lobbyState(lobby, a.uid, now) });
  } catch (err) {
    return lobbyFail(err, "state");
  }
}
