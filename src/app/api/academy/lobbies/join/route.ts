import type { NextRequest, NextResponse } from "next/server";
import { json, preflight } from "@/lib/academy/groups-server";
import { nameAllowed } from "@/lib/academy/groups-names";
import { hiddenUsers, normalizeDisplayName } from "@/lib/academy/groups";
import { blocksTouching, clientIp, NAME_NOT_ALLOWED } from "@/lib/academy/groups-server";
import { joinLobbyDecision, normalizeLobbyCode } from "@/lib/academy/lobbies";
import { addPlayer, authed, lobbyByCode, lobbyById, lobbyFail, lobbyJoinLimited, lobbyState, playersOf } from "@/lib/academy/lobbies-server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export function OPTIONS(): NextResponse {
  return preflight();
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  const a = await authed(req);
  if (!("uid" in a)) return a;
  if (lobbyJoinLimited(`ip:${clientIp(req)}`) || lobbyJoinLimited(`user:${a.uid}`)) return json({ error: "rate_limited" }, 429);
  const displayName = normalizeDisplayName(a.body?.displayName);
  if (!displayName) return json({ error: "bad_request" }, 400);
  if (!nameAllowed(displayName)) return json({ error: NAME_NOT_ALLOWED }, 422);
  const code = normalizeLobbyCode(a.body?.code);
  const id = typeof a.body?.lobbyId === "string" ? a.body.lobbyId : null;
  if (!code && !id) return json({ error: "not_found" }, 404);
  try {
    const lobby = code ? await lobbyByCode(code) : await lobbyById(id as string);
    if (!lobby) return json({ error: "not_found" }, 404);
    const [players, blocks] = await Promise.all([playersOf([lobby.id]), blocksTouching(a.uid)]);
    if (hiddenUsers(blocks, a.uid).has(lobby.host_id)) return json({ error: "not_found" }, 404);
    const decision = joinLobbyDecision(lobby, players, a.uid);
    if (decision === "full") return json({ error: "lobby_full" }, 409);
    if (decision === "started") return json({ error: "lobby_started" }, 409);
    if (decision === "ok") await addPlayer(lobby.id, a.uid, displayName);
    return json({ lobby: await lobbyState(lobby, a.uid, Date.now(), blocks) });
  } catch (err) {
    return lobbyFail(err, "join");
  }
}
