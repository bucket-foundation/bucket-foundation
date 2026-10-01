import { NextRequest } from "next/server";
import { canonSearch, parseCanonSearchParams } from "@/lib/canon-search";
import { loadAdvisors } from "@/lib/explore/advisors";
import timeline from "@/data/canon-timeline.json";
import { HIT_TYPES, advisorId, unify, type HitType } from "@/lib/explore/search";
import { foundingFor } from "@/lib/explore/founding";
import { loadExploreCorpus, rankedPools } from "@/lib/explore/ranked";
import { talkFor } from "@/lib/explore/talks";

const YEAR_BY_ID = new Map<string, number>(timeline.events.map((e: { id: string; year: number }) => [e.id, e.year]));

const MAP_ADVISOR_CAP = 400;

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
}

export async function GET(req: NextRequest) {
  const t0 = Date.now();
  const url = new URL(req.url);
  if (url.searchParams.get("map") === "1") {
    const { sources, sample, axes, origin } = loadAdvisors();
    const advisors = sources
      .filter((a) => a.star?.length)
      .sort((a, b) => b.score - a.score || a.rank - b.rank)
      .slice(0, MAP_ADVISOR_CAP)
      .map((a) => ({ id: advisorId(a), name: a.name, field: a.field, score: a.score, star: a.star }));
    return json({ advisors_sample: sample, advisors_source: origin, axes_split: origin === "bundle", axes, advisors });
  }
  const params = parseCanonSearchParams(url, 40);
  const types = (url.searchParams.get("types") || "")
    .split(",")
    .filter((t): t is HitType => (HIT_TYPES as string[]).includes(t));
  const found = canonSearch(params);
  if (!found.ok) return json({ error: { code: found.code, message: found.message } }, found.status);

  const year = (concept: string) => YEAR_BY_ID.get(concept) ?? null;
  const semantic = found.mode === "semantic";
  const founding = params.branch ? null : foundingFor(params.q);
  const corpus = await loadExploreCorpus();
  const bonus = founding?.hitId && founding.bonus > 0 ? new Map([[founding.hitId, founding.bonus]]) : undefined;
  const ranked = rankedPools(params.q, corpus, { branch: params.branch, bonus, year, minShare: url.searchParams.get("match") === "any" ? 0 : undefined });
  const excerpts = semantic
    ? found.results.map(({ entry, score }) => ({ branch: entry.branch, concept: entry.concept, slug: entry.slug, title: entry.title, text: entry.text, score, year: year(entry.concept), talk: talkFor(entry.path) }))
    : ranked.excerpts;
  const { sources, sample, origin } = loadAdvisors();
  const advisors = params.branch ? [] : sources;
  const results = unify({
    query: params.q,
    excerpts,
    advisors,
    sources: params.branch ? [] : ranked.sources,
    types,
    topK: params.topK,
    extraHits: params.branch ? [] : ranked.files,
    stats: corpus.stats,
    semantic,
  });
  return json({
    query: params.q || null,
    top_k: params.topK,
    mode: found.mode,
    n_results: results.length,
    advisors_sample: sample,
    advisors_source: origin,
    pinned: founding?.card ?? null,
    results,
    took_ms: Date.now() - t0,
  });
}
