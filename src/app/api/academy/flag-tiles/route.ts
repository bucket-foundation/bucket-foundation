import type { NextRequest, NextResponse } from "next/server";
import { json, langCorpus, preflight } from "@/lib/academy/groups-server";
import { deckDate, flagTilesDeck, ghosts } from "@/lib/academy/flag-tiles";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export function OPTIONS(): NextResponse {
  return preflight();
}

export async function GET(req: NextRequest): Promise<NextResponse> {
  const date = deckDate(new URL(req.url).searchParams.get("date"), Date.now());
  if (!date) return json({ error: "bad_request" }, 400);
  const corpus = langCorpus();
  if (!corpus) return json({ error: "sync_unavailable" }, 503);
  const deck = flagTilesDeck(corpus.items, date);
  if (deck.langs.length < 4 || deck.tiles.length < 40) return json({ error: "no_words" }, 503);
  return json({ deck, ghosts: ghosts(date) });
}
