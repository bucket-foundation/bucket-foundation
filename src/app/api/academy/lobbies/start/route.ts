import type { NextRequest, NextResponse } from "next/server";
import { json, preflight } from "@/lib/academy/groups-server";
import { langCorpus, service } from "@/lib/academy/groups-server";
import { LANG_CODES } from "@/lib/academy/lang-systems";
import { buildPrompts, LEAD_MS, startDecision } from "@/lib/academy/lobbies";
import { authed, checkLobby, LOBBIES, PROMPTS, lobbyFail, lobbyState, memberLobby, playersOf } from "@/lib/academy/lobbies-server";
import type { LobbyRow } from "@/lib/academy/lobbies";

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
    const prompts = buildPrompts(langCorpus()?.items ?? [], lobby, LANG_CODES);
    if (prompts.length < 3) return json({ error: "no_words" }, 422);
    checkLobby(await service().from(PROMPTS).delete().eq("lobby_id", lobby.id), "prompts clear");
    checkLobby(await service().from(PROMPTS).insert(prompts), "prompts");
    const startedAt = new Date(Date.now() + LEAD_MS).toISOString();
    const rows = checkLobby(await service().from(LOBBIES).update({ status: "playing", started_at: startedAt, rounds: prompts.length }).eq("id", lobby.id).eq("status", "lobby").select("*"), "start") as LobbyRow[];
    if (!rows[0]) return json({ error: "lobby_started" }, 409);
    return json({ lobby: await lobbyState(rows[0], a.uid, Date.now()) });
  } catch (err) {
    return lobbyFail(err, "start");
  }
}
