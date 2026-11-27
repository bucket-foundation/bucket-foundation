import type { NextRequest, NextResponse } from "next/server";
import { json, preflight } from "@/lib/academy/groups-server";
import { endEnabled, hostLeaveDecision } from "@/lib/academy/lobbies";
import { service } from "@/lib/academy/groups-server";
import { authed, checkLobby, closeLobbies, closeRace, LOBBIES, lobbyById, lobbyFail, lobbyIdOf, PLAYERS, playersOf, SCREENS } from "@/lib/academy/lobbies-server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export function OPTIONS(): NextResponse {
  return preflight();
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  const a = await authed(req);
  if (!("uid" in a)) return a;
  try {
    const lobbyId = lobbyIdOf(a.body?.lobbyId);
    const current = await lobbyById(lobbyId);
    if (endEnabled() && current && current.host_id === a.uid && !current.standing_slot && current.status !== "done") {
      const now = Date.now();
      const decision = hostLeaveDecision(a.uid, await playersOf([current.id]), now);
      if (decision.kind === "close") {
        await closeLobbies([current.id], now);
        return json({ ok: true, result: "closed" });
      }
      checkLobby(await service().from(LOBBIES).update({ host_id: decision.to }).eq("id", current.id).eq("host_id", a.uid), "handoff");
      checkLobby(await service().from(PLAYERS).delete().eq("lobby_id", current.id).eq("user_id", a.uid), "handoff seat");
      checkLobby(await service().from(SCREENS).delete().eq("lobby_id", current.id).eq("user_id", a.uid), "handoff screen");
      return json({ ok: true, result: "handoff" });
    }
    const res = await service().rpc("leave_lobby", { p_lobby: lobbyId, p_user: a.uid });
    if (res.error) throw new Error(res.error.message);
    if (res.data === "not_found" || res.data === "not_member") return json({ error: "not_found" }, 404);
    const left = res.data === "closed" ? null : await lobbyById(lobbyId);
    if (left) await closeRace(left);
    return json({ ok: true, result: res.data });
  } catch (err) {
    return lobbyFail(err, "leave");
  }
}
