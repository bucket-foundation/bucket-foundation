import type { NextRequest, NextResponse } from "next/server";
import { json, langCorpus, preflight } from "@/lib/academy/groups-server";
import { foreheadDeck, foreheadLangs, foreheadSeed } from "@/lib/academy/forehead";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export function OPTIONS(): NextResponse {
  return preflight();
}

export async function GET(req: NextRequest): Promise<NextResponse> {
  const params = new URL(req.url).searchParams;
  const langs = foreheadLangs(params.get("langs"));
  const seed = foreheadSeed(params.get("seed"));
  if (!langs || !seed) return json({ error: "bad_request" }, 400);
  const corpus = langCorpus();
  if (!corpus) return json({ error: "sync_unavailable" }, 503);
  const cards = foreheadDeck(corpus.items, langs, seed);
  if (cards.length < 10) return json({ error: "no_words" }, 503);
  return json({ cards });
}
