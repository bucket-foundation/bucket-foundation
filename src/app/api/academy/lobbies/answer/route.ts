import type { NextRequest, NextResponse } from "next/server";
import { json, preflight } from "@/lib/academy/groups-server";
import { service } from "@/lib/academy/groups-server";
import { answerDecision } from "@/lib/academy/lobbies";
import { authed, lobbyFail, lobbyState, memberLobby, settle } from "@/lib/academy/lobbies-server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export function OPTIONS(): NextResponse {
  return preflight();
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  const a = await authed(req);
  if (!("uid" in a)) return a;
  const round = a.body?.round;
  const choice = typeof a.body?.choice === "string" ? a.body.choice.slice(0, 200) : "";
  const correct = a.body?.correct;
  if (typeof round !== "number" || !Number.isInteger(round) || round < 0 || !choice || typeof correct !== "boolean") return json({ error: "bad_request" }, 400);
  try {
    const now = Date.now();
    const lobby = await settle(await memberLobby(a.uid, a.body?.lobbyId), now);
    const decision = answerDecision(lobby, round, correct, now);
    if (!decision.ok) return json({ error: decision.error }, 409);
    const res = await service().rpc("lobby_answer", { p_lobby: lobby.id, p_user: a.uid, p_round: round, p_choice: choice, p_correct: correct, p_ms: decision.ms, p_points: decision.points });
    if (res.error) throw new Error(res.error.message);
    if (res.data === "not_member") return json({ error: "not_found" }, 404);
    if (res.data === "already") return json({ error: "already_answered" }, 409);
    return json({ points: decision.points, ms: decision.ms, lobby: await lobbyState(lobby, a.uid, Date.now()) });
  } catch (err) {
    return lobbyFail(err, "answer");
  }
}
