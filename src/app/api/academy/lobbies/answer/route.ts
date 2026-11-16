import type { NextRequest, NextResponse } from "next/server";
import { json, preflight } from "@/lib/academy/groups-server";
import { authed, lobbyFail, lobbyState, memberLobby, settle, submitAnswer } from "@/lib/academy/lobbies-server";

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
  if (typeof round !== "number" || !Number.isInteger(round) || round < 0 || !choice) return json({ error: "bad_request" }, 400);
  try {
    const now = Date.now();
    const lobby = await settle(await memberLobby(a.uid, a.body?.lobbyId), now);
    const decision = await submitAnswer(lobby, a.uid, round, choice, now);
    if (!decision.ok) {
      if (decision.error === "not_member") return json({ error: "not_found" }, 404);
      return json({ error: decision.error }, decision.error === "bad_choice" ? 400 : 409);
    }
    return json({ correct: decision.correct, points: decision.points, ms: decision.ms, lobby: await lobbyState(lobby, a.uid, Date.now()) });
  } catch (err) {
    return lobbyFail(err, "answer");
  }
}
