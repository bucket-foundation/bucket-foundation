import type { NextRequest, NextResponse } from "next/server";
import { deckRoot } from "@/lib/academy/deck-root";
import { json, langCorpus, preflight } from "@/lib/academy/groups-server";
import { babelLevel, babelMeanings, BABEL_MEANINGS } from "@/lib/academy/babel";
import { foreheadLangs } from "@/lib/academy/forehead";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export function OPTIONS(): NextResponse {
  return preflight();
}

export async function GET(req: NextRequest): Promise<NextResponse> {
  const params = new URL(req.url).searchParams;
  const langs = foreheadLangs(params.get("langs"));
  const level = babelLevel(params.get("level"));
  if (!langs || langs.length < 2 || langs.length > 4 || !level) return json({ error: "bad_request" }, 400);
  const corpus = langCorpus();
  if (!corpus) return json({ error: "sync_unavailable" }, 503);
  const root = deckRoot(params.get("root"), corpus.items);
  const meanings = babelMeanings(corpus.items, langs.filter((l) => l !== root), level, root);
  if (meanings.length < BABEL_MEANINGS) return json({ error: "no_words" }, 503);
  const res = json({ level, langs, meanings });
  res.headers.set("cache-control", "public, max-age=3600");
  return res;
}
