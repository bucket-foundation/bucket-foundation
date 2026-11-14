import type { NextRequest, NextResponse } from "next/server";
import { canonicalDeckUrl, deckRoot, hasExtraParams, langsWithoutRoot } from "@/lib/academy/deck-root";
import { NextResponse as Res } from "next/server";

const KEYS = ["langs", "level", "root"];
import { json, langCorpus, preflight } from "@/lib/academy/groups-server";
import { babelLevel, babelMeanings, BABEL_MEANINGS } from "@/lib/academy/babel";
import { foreheadLangs } from "@/lib/academy/forehead";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export function OPTIONS(): NextResponse {
  return preflight();
}

export async function GET(req: NextRequest): Promise<NextResponse> {
  const url = new URL(req.url);
  if (hasExtraParams(url, KEYS)) return Res.redirect(canonicalDeckUrl(url, KEYS), 308);
  const params = url.searchParams;
  const level = babelLevel(params.get("level"));
  const corpus = langCorpus();
  if (!corpus) return json({ error: "sync_unavailable" }, 503);
  const root = deckRoot(params.get("root"), corpus.items);
  const langs = langsWithoutRoot(foreheadLangs(params.get("langs")), root);
  if (!langs || !level) return json({ error: "bad_request" }, 400);
  const meanings = babelMeanings(corpus.items, langs, level, root);
  if (meanings.length < BABEL_MEANINGS) return json({ error: "no_words" }, 503);
  const res = json({ level, langs, meanings });
  res.headers.set("cache-control", "public, max-age=3600");
  return res;
}
