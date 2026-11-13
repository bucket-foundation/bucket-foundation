import type { NextRequest, NextResponse } from "next/server";
import { json, preflight } from "@/lib/academy/groups-server";
import { startDecision } from "@/lib/academy/lobbies";
import { authed, lobbyFail, lobbyState, memberLobby, playersOf, startLobby } from "@/lib/academy/lobbies-server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export function OPTIONS(): NextResponse {
  return preflight();
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  const a = await authed(req);
  if (!("uid" in a)) return a;
  try {
    const lobby = await memberLobby(a.uid, a.body?.lobbyId);
    const decision = startDecision(lobby, await playersOf([lobby.id]), a.uid);
    if (decision === "not_host") return json({ error: "not_host" }, 403);
    if (decision === "not_lobby") return json({ error: "lobby_started" }, 409);
    if (decision === "need_ready") return json({ error: "need_ready" }, 409);
    const started = await startLobby(lobby, Date.now());
    if (!started.ok) return json({ error: started.error }, started.error === "no_words" ? 422 : 409);
    return json({ lobby: await lobbyState(started.lobby, a.uid, Date.now()) });
  } catch (err) {
    return lobbyFail(err, "start");
  }
}
