import type { NextRequest, NextResponse } from "next/server";
import { json, preflight } from "@/lib/academy/groups-server";
import { authed, lobbyFail, lobbyState, memberLobby, settle, submitRaceScore } from "@/lib/academy/lobbies-server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export function OPTIONS(): NextResponse {
  return preflight();
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  const a = await authed(req);
  if (!("uid" in a)) return a;
  try {
    const now = Date.now();
    const lobby = await settle(await memberLobby(a.uid, a.body?.lobbyId), now);
    const result = await submitRaceScore(lobby, a.uid, a.body?.score, now);
    if (!result.ok) {
      if (result.error === "not_member") return json({ error: "not_found" }, 404);
      return json({ error: result.error }, result.error === "bad_score" ? 400 : 409);
    }
    return json({ score: result.score, lobby: await lobbyState(result.lobby, a.uid, Date.now()) });
  } catch (err) {
    return lobbyFail(err, "score");
  }
}
