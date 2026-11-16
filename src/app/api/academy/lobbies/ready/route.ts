import type { NextRequest, NextResponse } from "next/server";
import { json, preflight } from "@/lib/academy/groups-server";
import { service } from "@/lib/academy/groups-server";
import { authed, checkLobby, lobbyFail, lobbyState, memberLobby, pace, PLAYERS } from "@/lib/academy/lobbies-server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export function OPTIONS(): NextResponse {
  return preflight();
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  const a = await authed(req);
  if (!("uid" in a)) return a;
  if (typeof a.body?.ready !== "boolean") return json({ error: "bad_request" }, 400);
  try {
    const lobby = await memberLobby(a.uid, a.body.lobbyId);
    if (lobby.status !== "lobby") return json({ error: "lobby_started" }, 409);
    checkLobby(await service().from(PLAYERS).update({ ready: a.body.ready, last_seen: new Date().toISOString() }).eq("lobby_id", lobby.id).eq("user_id", a.uid), "ready");
    const now = Date.now();
    return json({ lobby: await lobbyState(await pace(lobby, now), a.uid, now) });
  } catch (err) {
    return lobbyFail(err, "ready");
  }
}
