import { createHash } from "node:crypto";
import type { NextRequest, NextResponse } from "next/server";
import { json, preflight } from "@/lib/academy/groups-server";
import { roomSignal } from "@/lib/academy/lobbies";
import { authed, broadcastRoom, limited, lobbyFail, memberLobby, playersOf, roomRealtime } from "@/lib/academy/lobbies-server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SIGNALS_PER_MINUTE = 40;

export function OPTIONS(): NextResponse {
  return preflight();
}

export async function GET(req: NextRequest): Promise<NextResponse> {
  const a = await authed(req, false);
  if (!("uid" in a)) return a;
  try {
    const lobbyId = new URL(req.url).searchParams.get("lobbyId");
    const lobby = await memberLobby(a.uid, lobbyId, true, true);
    const realtime = roomRealtime(lobby.id);
    return realtime ? json({ realtime }) : json({ error: "realtime_off" }, 404);
  } catch (err) {
    return lobbyFail(err, "react config");
  }
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  const a = await authed(req);
  if (!("uid" in a)) return a;
  const signal = roomSignal(a.body);
  if (!signal) return json({ error: "bad_request" }, 400);
  try {
    const lobby = await memberLobby(a.uid, a.body?.lobbyId, true, true);
    if (lobby.status === "done") return json({ error: "lobby_started" }, 409);
    if (signal.kind === "vote" && (lobby.status !== "playing" || (await playersOf([lobby.id])).some((p) => p.user_id === a.uid))) return json({ error: "not_audience" }, 403);
    if (await limited(`react:${lobby.id}:${a.uid}`, SIGNALS_PER_MINUTE)) return json({ error: "rate_limited" }, 429);
    const from = createHash("sha256").update(`${lobby.id}:${a.uid}`).digest("hex").slice(0, 12);
    const sent = await broadcastRoom(lobby.id, { ...signal, from });
    return json({ ok: sent });
  } catch (err) {
    return lobbyFail(err, "react");
  }
}
