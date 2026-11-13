import type { NextRequest, NextResponse } from "next/server";
import { json, langCorpus, preflight } from "@/lib/academy/groups-server";
import { spyRounds, spyScene } from "@/lib/academy/ispy";
import { LANGS } from "@/lib/academy/lang-systems";
import { revealEntries } from "@/lib/academy/lobby-reveal";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export function OPTIONS(): NextResponse {
  return preflight();
}

export async function GET(req: NextRequest): Promise<NextResponse> {
  const q = new URL(req.url).searchParams;
  const root = q.get("root") ?? "en";
  const targets = (q.get("langs") ?? "").split(",").filter((l) => l in LANGS && l !== root).slice(0, 8);
  const seed = (q.get("seed") ?? "").replace(/[^0-9a-z]/gi, "").slice(0, 24) || String(Date.now());
  const scene = q.get("scene");
  if (!(root in LANGS) || !targets.length || (scene && !spyScene(scene))) return json({ error: "bad_request" }, 400);
  const corpus = langCorpus();
  if (!corpus) return json({ error: "sync_unavailable" }, 503);
  const byId = new Map(corpus.items.map((i) => [i.id, i]));
  const rounds = spyRounds(corpus.items, { seed, root, targets, rounds: 10, scene: scene ?? undefined }).map((r) => ({ ...r, reveal: revealEntries(r, root, byId.get(r.item_id) ?? null, () => []) }));
  if (rounds.length < 4) return json({ error: "no_words" }, 503);
  return json({ rounds });
}
