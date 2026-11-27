import type { NextRequest, NextResponse } from "next/server";
import { json, preflight, service } from "@/lib/academy/groups-server";
import { audienceEnabled, normalizeLobbySettings, setupEnabled, type LobbyRow } from "@/lib/academy/lobbies";
import { authed, checkLobby, LOBBIES, LOBBY_COLS, lobbyFail, lobbyState, memberLobby } from "@/lib/academy/lobbies-server";

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
    if (typeof a.body?.guestsWatch === "boolean") {
      if (!audienceEnabled()) return json({ error: "audience_off" }, 409);
      const rows = checkLobby(await service().from(LOBBIES).update({ guests_watch: a.body.guestsWatch }).eq("id", lobby.id).select(LOBBY_COLS), "guests watch") as LobbyRow[];
      return json({ lobby: await lobbyState(rows[0] ?? lobby, a.uid, Date.now()) });
    }
    if (lobby.status !== "lobby") return json({ error: "lobby_started" }, 409);
    if (!setupEnabled() && (a.body?.setup ?? "single") !== "single") return json({ error: "setup_off" }, 409);
    const patch = normalizeLobbySettings(a.body, lobby);
    if (!patch) return json({ error: "bad_request" }, 400);
    const update = { game: patch.game, targets: patch.targets, ...(setupEnabled() ? { playlist: patch.playlist, mix: patch.mix } : {}) };
    const rows = checkLobby(await service().from(LOBBIES).update(update).eq("id", lobby.id).eq("status", "lobby").select(LOBBY_COLS), "settings") as LobbyRow[];
    if (!rows[0]) return json({ error: "lobby_started" }, 409);
    return json({ lobby: await lobbyState(rows[0], a.uid, Date.now()) });
  } catch (err) {
    return lobbyFail(err, "settings");
  }
}
