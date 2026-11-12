import type { NextRequest, NextResponse } from "next/server";
import { json, preflight } from "@/lib/academy/groups-server";
import { nameAllowed } from "@/lib/academy/groups-names";
import { hiddenUsers, normalizeDisplayName, uuidOrNull } from "@/lib/academy/groups";
import { blocksTouching, clientIp, NAME_NOT_ALLOWED } from "@/lib/academy/groups-server";
import { JOIN_PER_MINUTE, joinLobbyDecision, normalizeLobbyCode } from "@/lib/academy/lobbies";
import { botsEnabled } from "@/lib/academy/lobby-bots";
import { service } from "@/lib/academy/groups-server";
import { addPlayer, PLAYERS, checkLobby, authed, limited, lobbyByCode, lobbyById, lobbyFail, lobbyState, playersOf } from "@/lib/academy/lobbies-server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export function OPTIONS(): NextResponse {
  return preflight();
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  const a = await authed(req);
  if (!("uid" in a)) return a;
  const displayName = normalizeDisplayName(a.body?.displayName);
  if (!displayName) return json({ error: "bad_request" }, 400);
  if (!nameAllowed(displayName)) return json({ error: NAME_NOT_ALLOWED }, 422);
  const code = normalizeLobbyCode(a.body?.code);
  const id = a.body?.lobbyId === undefined ? null : uuidOrNull(a.body.lobbyId);
  if (!code && !id) return json({ error: "not_found" }, 404);
  try {
    if ((await limited(`join:ip:${clientIp(req)}`, JOIN_PER_MINUTE)) || (await limited(`join:user:${a.uid}`, JOIN_PER_MINUTE))) return json({ error: "rate_limited" }, 429);
    const lobby = code ? await lobbyByCode(code) : await lobbyById(id as string);
    if (!lobby) return json({ error: "not_found" }, 404);
    const [players, blocks] = await Promise.all([playersOf([lobby.id]), blocksTouching(a.uid)]);
    if (hiddenUsers(blocks, a.uid).has(lobby.host_id)) return json({ error: "not_found" }, 404);
    const decision = joinLobbyDecision(lobby, players, a.uid);
    const bump = decision === "full" && lobby.standing_slot && botsEnabled() ? players.find((p) => p.is_bot && p.user_id !== lobby.host_id) : undefined;
    if (bump) checkLobby(await service().from(PLAYERS).delete().eq("lobby_id", lobby.id).eq("user_id", bump.user_id), "bot bump");
    if (decision === "full" && !bump) return json({ error: "lobby_full" }, 409);
    if (decision === "started") return json({ error: "lobby_started" }, 409);
    if (decision === "ok" || bump) await addPlayer(lobby.id, a.uid, displayName);
    return json({ lobby: await lobbyState(lobby, a.uid, Date.now(), blocks) });
  } catch (err) {
    return lobbyFail(err, "join");
  }
}
