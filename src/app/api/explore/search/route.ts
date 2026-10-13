import { NextRequest } from "next/server";
import { canonSearch } from "@/lib/canon-search";
import { canonFileHits } from "@/lib/explore/canon-files";
import { loadAdvisors } from "@/lib/explore/advisors";
import timeline from "@/data/canon-timeline.json";
import { exploreSearch, type ExploreSearchDeps } from "@/lib/explore/respond";
import { foundingFor } from "@/lib/explore/founding";
import { loadExploreCorpus, needsClosest, rankedPools, semanticExcerpts } from "@/lib/explore/ranked";
import { talkFor } from "@/lib/explore/talks";
import { loadSourceIndex } from "@/lib/explore/sources";

const YEAR_BY_ID = new Map<string, number>(timeline.events.map((e: { id: string; year: number }) => [e.id, e.year]));

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const deps: ExploreSearchDeps = {
  canon: canonSearch,
  advisors: () => loadAdvisors(),
  sources: () => loadSourceIndex(),
  yearOf: (concept) => YEAR_BY_ID.get(concept) ?? null,
  canonFiles: (query) => canonFileHits(query),
  ranking: { corpus: loadExploreCorpus, founding: foundingFor, talkFor, rankedPools, semanticExcerpts, needsClosest },
};

export async function GET(req: NextRequest) {
  const { status, body } = await exploreSearch(deps, new URL(req.url));
  return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
}
