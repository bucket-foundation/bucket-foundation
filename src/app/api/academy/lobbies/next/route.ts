import type { NextRequest, NextResponse } from "next/server";
import { json, preflight } from "@/lib/academy/groups-server";
import { againHosted, authed, lobbyFail, lobbyState, memberLobby, pace } from "@/lib/academy/lobbies-server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export function OPTIONS(): NextResponse {
  return preflight();
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  const a = await authed(req);
  if (!("uid" in a)) return a;
  try {
    const lobby = await memberLobby(a.uid, a.body?.lobbyId, false, true);
    if (lobby.host_id !== a.uid) return json({ error: "not_host" }, 403);
    if (lobby.status !== "done") return json({ error: "lobby_started" }, 409);
    const now = Date.now();
    const next = await againHosted(lobby, now, true);
    return json({ lobby: await lobbyState(await pace(next, now), a.uid, now) });
  } catch (err) {
    return lobbyFail(err, "next");
  }
}
