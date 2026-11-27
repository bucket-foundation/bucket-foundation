import type { NextRequest, NextResponse } from "next/server";
import { normalizeDisplayName } from "@/lib/academy/groups";
import { json, preflight, service } from "@/lib/academy/groups-server";
import { addPlayer, addScreen, authed, checkLobby, lobbyById, lobbyFail, lobbyState, memberLobby, PLAYERS, SCREENS } from "@/lib/academy/lobbies-server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export function OPTIONS(): NextResponse {
  return preflight();
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  const a = await authed(req);
  if (!("uid" in a)) return a;
  if (typeof a.body?.screen !== "boolean") return json({ error: "bad_request" }, 400);
  try {
    const lobby = await memberLobby(a.uid, a.body?.lobbyId);
    if (lobby.host_id !== a.uid) return json({ error: "not_host" }, 403);
    if (lobby.status !== "lobby" || lobby.standing_slot) return json({ error: "lobby_started" }, 409);
    if (a.body.screen) {
      checkLobby(await service().from(PLAYERS).delete().eq("lobby_id", lobby.id).eq("user_id", a.uid), "host seat");
      await addScreen(lobby.id, a.uid);
    } else {
      const displayName = normalizeDisplayName(a.body?.displayName);
      if (!displayName) return json({ error: "bad_request" }, 400);
      checkLobby(await service().from(SCREENS).delete().eq("lobby_id", lobby.id).eq("user_id", a.uid), "host screen");
      await addPlayer(lobby.id, a.uid, displayName);
    }
    return json({ lobby: await lobbyState((await lobbyById(lobby.id)) ?? lobby, a.uid, Date.now()) });
  } catch (err) {
    return lobbyFail(err, "hostmode");
  }
}
