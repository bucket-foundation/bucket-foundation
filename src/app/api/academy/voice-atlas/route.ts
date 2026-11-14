import type { NextRequest, NextResponse } from "next/server";
import { deckRoot } from "@/lib/academy/deck-root";
import { json, langCorpus, preflight } from "@/lib/academy/groups-server";
import { deckDate } from "@/lib/academy/flag-tiles";
import { atlasGhosts, atlasRounds, ATLAS_ROUNDS } from "@/lib/academy/voice-atlas";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export function OPTIONS(): NextResponse {
  return preflight();
}

export async function GET(req: NextRequest): Promise<NextResponse> {
  const url = new URL(req.url);
  const date = deckDate(url.searchParams.get("date"), Date.now());
  if (!date) return json({ error: "bad_request" }, 400);
  const corpus = langCorpus();
  if (!corpus) return json({ error: "sync_unavailable" }, 503);
  const rounds = atlasRounds(corpus.items, date, ATLAS_ROUNDS + 1, deckRoot(url.searchParams.get("root"), corpus.items));
  if (rounds.length < ATLAS_ROUNDS + 1) return json({ error: "no_words" }, 503);
  const res = json({ date, rounds, ghosts: atlasGhosts(date) });
  res.headers.set("cache-control", "public, max-age=300");
  return res;
}
