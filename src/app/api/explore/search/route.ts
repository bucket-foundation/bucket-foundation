import { NextRequest } from "next/server";
import { canonSearch, parseCanonSearchParams } from "@/lib/canon-search";
import { canonFileHits } from "@/lib/explore/canon-files";
import { loadAdvisors } from "@/lib/explore/advisors";
import timeline from "@/data/canon-timeline.json";
import { HIT_TYPES, advisorId, unify, type HitType } from "@/lib/explore/search";
import { loadSourceIndex, searchSources, sourceToHit } from "@/lib/explore/sources";

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

  const excerpts = found.results.map(({ entry, score }) => ({
    branch: entry.branch,
    concept: entry.concept,
    slug: entry.slug,
    title: entry.title,
    text: entry.text,
    score,
    year: YEAR_BY_ID.get(entry.concept) ?? null,
  }));
  const { sources, sample, origin } = loadAdvisors();
  const advisors = params.branch ? [] : sources;
  const wantsSources = !types.length || types.some((t) => t === "paper" || t === "text" || t === "talk");
  const sourceHits = wantsSources && !params.branch ? searchSources(params.q, await loadSourceIndex()).map(sourceToHit) : [];
  const results = unify({ query: params.q, excerpts, advisors, sources: sourceHits, types, topK: params.topK, extraHits: params.branch ? [] : canonFileHits(params.q) });
  return json({
    query: params.q || null,
    top_k: params.topK,
    mode: found.mode,
    n_results: results.length,
    advisors_sample: sample,
    advisors_source: origin,
    results,
    took_ms: Date.now() - t0,
  });
}
