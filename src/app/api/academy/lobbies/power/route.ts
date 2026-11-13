import type { NextRequest, NextResponse } from "next/server";
import { json, preflight, service } from "@/lib/academy/groups-server";
import { coinsOf, duelEnabled, powerDecision, type LobbyAnswerRow } from "@/lib/academy/lobbies";
import { ANSWERS, authed, checkLobby, lobbyFail, lobbyState, memberLobby, POWERS, powersOf } from "@/lib/academy/lobbies-server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export function OPTIONS(): NextResponse {
  return preflight();
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  const a = await authed(req);
  if (!("uid" in a)) return a;
  if (!duelEnabled()) return json({ error: "not_found" }, 404);
  try {
    const lobby = await memberLobby(a.uid, a.body?.lobbyId);
    const now = Date.now();
    const answers = checkLobby(await service().from(ANSWERS).select("user_id,correct").eq("lobby_id", lobby.id).eq("user_id", a.uid), "coins") as Pick<LobbyAnswerRow, "user_id" | "correct">[];
    const decision = powerDecision(lobby, a.body?.kind, coinsOf(answers, await powersOf(lobby), a.uid), now);
    if (!decision.ok) return json({ error: decision.error }, decision.error === "bad_request" ? 400 : 409);
    const res = await service().from(POWERS).insert({ lobby_id: lobby.id, user_id: a.uid, round: decision.round, kind: a.body?.kind });
    if (res.error && /duplicate key|unique/i.test(res.error.message)) return json({ error: "power_used" }, 409);
    checkLobby(res, "power");
    return json({ lobby: await lobbyState(lobby, a.uid, now) });
  } catch (err) {
    return lobbyFail(err, "power");
  }
}
