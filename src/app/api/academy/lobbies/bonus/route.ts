import type { NextRequest, NextResponse } from "next/server";
import { deckRoot } from "@/lib/academy/deck-root";
import { json, langCorpus, preflight, service } from "@/lib/academy/groups-server";
import { deckDate } from "@/lib/academy/flag-tiles";
import { foreheadHolder, gameEndMs, interludeAt } from "@/lib/academy/lobbies";
import { authed, broadcastRoom, checkLobby, limited, lobbyFail, memberLobby, PLAYERS, playersOf } from "@/lib/academy/lobbies-server";
import { ATLAS_ROUNDS, atlasPoints, atlasRounds, nearestHome } from "@/lib/academy/voice-atlas";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const FOREHEAD_POINTS = 100;

export function OPTIONS(): NextResponse {
  return preflight();
}

async function award(lobbyId: string, uid: string, points: number): Promise<void> {
  const rows = checkLobby(await service().from(PLAYERS).select("score").eq("lobby_id", lobbyId).eq("user_id", uid).limit(1), "bonus seat") as { score: number }[];
  if (!rows[0]) return;
  checkLobby(await service().from(PLAYERS).update({ score: rows[0].score + points }).eq("lobby_id", lobbyId).eq("user_id", uid), "bonus");
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  const a = await authed(req);
  if (!("uid" in a)) return a;
  const kind = a.body?.kind;
  if (kind !== "atlas" && kind !== "forehead") return json({ error: "bad_request" }, 400);
  try {
    const lobby = kind === "forehead" ? await memberLobby(a.uid, a.body?.lobbyId, false, true) : await memberLobby(a.uid, a.body?.lobbyId);
    const now = Date.now();
    const slot = interludeAt(lobby, now);
    if (kind === "atlas") {
      const lat = Number(a.body?.lat);
      const lon = Number(a.body?.lon);
      if (slot?.kind !== "voice-atlas" || slot.clip !== a.body?.clip || !Number.isFinite(lat) || !Number.isFinite(lon)) return json({ error: "wrong_round" }, 409);
      const corpus = langCorpus();
      if (!corpus) return json({ error: "sync_unavailable" }, 503);
      const date = deckDate(null, gameEndMs({ ...lobby, started_at: lobby.started_at as string }));
      const round = atlasRounds(corpus.items, date as string, ATLAS_ROUNDS + 1, deckRoot(lobby.root, corpus.items))[slot.clip];
      const near = round ? nearestHome(round.lang, [lat, lon]) : null;
      if (!near) return json({ error: "bad_request" }, 400);
      if (await limited(`atlas:${lobby.id}:${lobby.started_at}:${slot.clip}:${a.uid}`, 1)) return json({ error: "already_answered" }, 409);
      const points = atlasPoints(near.km);
      await award(lobby.id, a.uid, points);
      return json({ points, km: Math.round(near.km), lang: round.lang });
    }
    if (lobby.host_id !== a.uid) return json({ error: "not_host" }, 403);
    if (slot?.kind !== "forehead" || slot.card !== a.body?.card) return json({ error: "wrong_round" }, 409);
    const holder = foreheadHolder(await playersOf([lobby.id]), slot.card);
    if (!holder) return json({ error: "wrong_round" }, 409);
    if (await limited(`forehead:${lobby.id}:${lobby.started_at}:${slot.card}`, 1)) return json({ error: "already_answered" }, 409);
    const got = a.body?.got === true;
    if (got) await award(lobby.id, holder, FOREHEAD_POINTS);
    await broadcastRoom(lobby.id, { kind: "forehead", card: slot.card, got, holder });
    return json({ ok: true, got, holder });
  } catch (err) {
    return lobbyFail(err, "bonus");
  }
}
