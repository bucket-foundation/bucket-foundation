import type { NextRequest, NextResponse } from "next/server";
import { json, preflight } from "@/lib/academy/groups-server";
import { service } from "@/lib/academy/groups-server";
import { SEEN_EVERY_MS } from "@/lib/academy/lobbies";
import { tickLobby } from "@/lib/academy/lobby-bots-server";
import { authed, checkLobby, lobbyFail, lobbyState, memberLobby, PLAYERS, SCREENS, pace, settle } from "@/lib/academy/lobbies-server";

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
    const lobby = await pace(await settle(await tickLobby(await memberLobby(a.uid, params.get("lobbyId"), true), now), now), now);
    const seenBefore = new Date(now - SEEN_EVERY_MS).toISOString();
    for (const table of [PLAYERS, SCREENS]) checkLobby(await service().from(table).update({ last_seen: new Date(now).toISOString() }).eq("lobby_id", lobby.id).eq("user_id", a.uid).lt("last_seen", seenBefore), "seen");
    if (lobby.status !== "playing" && Number.isFinite(since) && since === lobby.version) return json({ changed: false, version: lobby.version, now: new Date(now).toISOString() });
    return json({ changed: true, lobby: await lobbyState(lobby, a.uid, now) });
  } catch (err) {
    return lobbyFail(err, "state");
  }
}
