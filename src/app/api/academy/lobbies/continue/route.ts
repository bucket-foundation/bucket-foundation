import type { NextRequest, NextResponse } from "next/server";
import { json, preflight, service } from "@/lib/academy/groups-server";
import { setupEnabled } from "@/lib/academy/lobbies";
import { authed, checkLobby, lobbyFail, lobbyState, memberLobby, PLAYERS } from "@/lib/academy/lobbies-server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export function OPTIONS(): NextResponse {
  return preflight();
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  const a = await authed(req);
  if (!("uid" in a)) return a;
  if (!setupEnabled()) return json({ error: "not_found" }, 404);
  try {
    const lobby = await memberLobby(a.uid, a.body?.lobbyId);
    if (lobby.status !== "playing" || lobby.game !== "tiles") return json({ error: "not_playing" }, 409);
    const rows = checkLobby(await service().from(PLAYERS).update({ continues: 1 }).eq("lobby_id", lobby.id).eq("user_id", a.uid).eq("continues", 0).select("user_id"), "continue") as unknown[];
    if (rows.length === 0) return json({ error: "already_continued" }, 409);
    return json({ lobby: await lobbyState(lobby, a.uid, Date.now()) });
  } catch (err) {
    return lobbyFail(err, "continue");
  }
}
