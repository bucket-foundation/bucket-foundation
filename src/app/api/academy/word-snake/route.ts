import type { NextRequest, NextResponse } from "next/server";
import { json, langCorpus, preflight } from "@/lib/academy/groups-server";
import { foreheadLangs, foreheadSeed } from "@/lib/academy/forehead";
import { snakeDeck } from "@/lib/academy/word-snake";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export function OPTIONS(): NextResponse {
  return preflight();
}

export async function GET(req: NextRequest): Promise<NextResponse> {
  const params = new URL(req.url).searchParams;
  const langs = foreheadLangs(params.get("langs"));
  const seed = foreheadSeed(params.get("seed"));
  if (!langs || langs.length < 2 || !seed) return json({ error: "bad_request" }, 400);
  const corpus = langCorpus();
  if (!corpus) return json({ error: "sync_unavailable" }, 503);
  const deck = snakeDeck(corpus.items, langs[0], langs.slice(1), seed);
  if (deck.good.length < 20 || deck.decoys.length < 20) return json({ error: "no_words" }, 503);
  return json({ deck });
}
