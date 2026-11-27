import type { NextRequest, NextResponse } from "next/server";
import { normalizeDisplayName } from "@/lib/academy/groups";
import { json, preflight, service } from "@/lib/academy/groups-server";
import { addPlayer, addScreen, authed, checkLobby, lobbyById, lobbyFail, lobbyState, memberLobby, PLAYERS, SCREENS } from "@/lib/academy/lobbies-server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export function OPTIONS(): NextResponse {
  return preflight();
}

async function toScreen(lobbyId: string, uid: string): Promise<string | null> {
  const seat = checkLobby(await service().from(PLAYERS).delete().eq("lobby_id", lobbyId).eq("user_id", uid).select("display_name"), "host seat") as { display_name: string }[];
  await addScreen(lobbyId, uid);
  return seat[0]?.display_name ?? null;
}

async function toSeat(lobbyId: string, uid: string, name: string): Promise<void> {
  checkLobby(await service().from(SCREENS).delete().eq("lobby_id", lobbyId).eq("user_id", uid), "host screen");
  await addPlayer(lobbyId, uid, name);
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  const a = await authed(req);
  if (!("uid" in a)) return a;
  if (typeof a.body?.screen !== "boolean") return json({ error: "bad_request" }, 400);
  const name = normalizeDisplayName(a.body?.displayName);
  if (!a.body.screen && !name) return json({ error: "bad_request" }, 400);
  try {
    const lobby = await memberLobby(a.uid, a.body?.lobbyId, false, true);
    if (lobby.host_id !== a.uid) return json({ error: "not_host" }, 403);
    if (lobby.status !== "lobby" || lobby.standing_slot) return json({ error: "lobby_started" }, 409);
    const prior = a.body.screen ? await toScreen(lobby.id, a.uid) : (await toSeat(lobby.id, a.uid, name as string), null);
    const after = (await lobbyById(lobby.id)) ?? lobby;
    if (after.status !== "lobby") {
      if (a.body.screen) {
        if (prior) await toSeat(lobby.id, a.uid, prior);
      } else await toScreen(lobby.id, a.uid);
      return json({ error: "lobby_started" }, 409);
    }
    return json({ lobby: await lobbyState(after, a.uid, Date.now()) });
  } catch (err) {
    return lobbyFail(err, "hostmode");
  }
}
