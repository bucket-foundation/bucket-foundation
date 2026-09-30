import { branchIndex } from "../../components/canon-globe/projections";
import type { Hit } from "../explore/search";

const TAU = Math.PI * 2;

export type SortKey = "relevance" | "year" | "branch";

function byId(a: Hit, b: Hit): number {
  return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
}

export function sortHits(hits: Hit[], sort: SortKey): Hit[] {
  const out = hits.slice();
  if (sort === "year") out.sort((a, b) => (a.year ?? Infinity) - (b.year ?? Infinity) || byId(a, b));
  else if (sort === "branch") out.sort((a, b) => branchIndex(a.branch) - branchIndex(b.branch) || b.score - a.score || byId(a, b));
  else out.sort((a, b) => b.score - a.score || byId(a, b));
  return out;
}

export function thetaBySort(hits: Hit[], sort: SortKey): Map<string, number> {
  const sorted = sortHits(hits, sort);
  const n = Math.max(1, sorted.length);
  return new Map(sorted.map((h, i) => [h.id, (TAU * i) / n]));
}
