import type { NextRequest, NextResponse } from "next/server";
import { deckRoot } from "@/lib/academy/deck-root";
import { json, langCorpus, preflight } from "@/lib/academy/groups-server";
import { interludeAt } from "@/lib/academy/lobbies";
import { authed, lobbyFail, memberLobby, tvSeat } from "@/lib/academy/lobbies-server";
import { ATLAS_ROUNDS, atlasRevealedBefore, atlasRounds, nightAtlasKey, nightAtlasRounds } from "@/lib/academy/voice-atlas";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export function OPTIONS(): NextResponse {
  return preflight();
}

export async function GET(req: NextRequest): Promise<NextResponse> {
  const a = await authed(req, false);
  if (!("uid" in a)) return a;
  try {
    const lobby = await memberLobby(a.uid, new URL(req.url).searchParams.get("lobbyId"), true, true);
    if (!lobby.started_at) return json({ error: "wrong_round" }, 409);
    const corpus = langCorpus();
    if (!corpus) return json({ error: "sync_unavailable" }, 503);
    const rounds = atlasRounds(corpus.items, nightAtlasKey(lobby), ATLAS_ROUNDS + 1, deckRoot(lobby.root, corpus.items));
    const res = json({ rounds: nightAtlasRounds(rounds, atlasRevealedBefore(interludeAt(lobby, Date.now())), await tvSeat(lobby.id, a.uid)) });
    res.headers.set("cache-control", "private, no-store");
    return res;
  } catch (err) {
    return lobbyFail(err, "atlas");
  }
}
