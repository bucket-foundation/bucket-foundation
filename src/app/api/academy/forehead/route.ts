import type { NextRequest, NextResponse } from "next/server";
import { canonicalDeckUrl, deckRoot, hasExtraParams } from "@/lib/academy/deck-root";
import { NextResponse as Res } from "next/server";

const KEYS = ["langs", "seed", "root"];
import { json, langCorpus, preflight } from "@/lib/academy/groups-server";
import { foreheadDeck, foreheadLangs, foreheadSeed } from "@/lib/academy/forehead";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export function OPTIONS(): NextResponse {
  return preflight();
}

export async function GET(req: NextRequest): Promise<NextResponse> {
  const url = new URL(req.url);
  if (hasExtraParams(url, KEYS)) return Res.redirect(canonicalDeckUrl(url, KEYS), 308);
  const params = url.searchParams;
  const langs = foreheadLangs(params.get("langs"));
  const seed = foreheadSeed(params.get("seed"));
  if (!langs || !seed) return json({ error: "bad_request" }, 400);
  const corpus = langCorpus();
  if (!corpus) return json({ error: "sync_unavailable" }, 503);
  const root = deckRoot(params.get("root"), corpus.items);
  const cards = foreheadDeck(corpus.items, langs.filter((l) => l !== root), seed, root);
  if (cards.length < 10) return json({ error: "no_words" }, 503);
  return json({ cards });
}
