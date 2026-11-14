import type { NextRequest, NextResponse } from "next/server";
import { canonicalDeckUrl, deckRoot } from "@/lib/academy/deck-root";
import { NextResponse as Res } from "next/server";
import { json, langCorpus, preflight } from "@/lib/academy/groups-server";
import { deckDate } from "@/lib/academy/flag-tiles";
import { shiftBoard } from "@/lib/academy/shift";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function canonical(url: URL): NextResponse {
  return Res.redirect(canonicalDeckUrl(url), 308);
}

export function OPTIONS(): NextResponse {
  return preflight();
}

export async function GET(req: NextRequest): Promise<NextResponse> {
  const url = new URL(req.url);
  const extra = Array.from(url.searchParams.keys()).some((k) => k !== "date" && k !== "root");
  if (extra) return canonical(url);
  const date = deckDate(url.searchParams.get("date"), Date.now());
  if (!date) return json({ error: "bad_request" }, 400);
  const corpus = langCorpus();
  if (!corpus) return json({ error: "sync_unavailable" }, 503);
  const board = shiftBoard(corpus.items, date, deckRoot(url.searchParams.get("root"), corpus.items));
  if (!board) return json({ error: "no_words" }, 503);
  const res = json({ board });
  res.headers.set("cache-control", "public, max-age=300");
  return res;
}
