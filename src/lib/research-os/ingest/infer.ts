/**
 * Research OS for K-12, offline prerequisite-edge inference (bkt-ros
 * ros-03 item 4; PLAN-REVISION-1.md section 3 item 3, "Prerequisite edge
 * inference, confidence-weighted, folded into ros-03's scope"). Proposes a
 * `prerequisite` edge between two EXISTING node drafts from lexical
 * overlap of their summaries and tier ordering alone: no LLM, no network
 * call, matching this ingestion slice's dependency-free discipline
 * (academy.ts, canon.ts). Gasparetti et al. 2017
 * (_intake/research-os-k12-literature/prerequisite-knowledge-graphs/
 * gasparetti-et-al-2017-prerequisites-between-learning-objects.md) is the
 * direct precedent: a supervised classifier over lexical/structural
 * features proposing prerequisite edges, then routed backward from a
 * target, the same operation frontier.ts's computeFrontier performs. Their
 * finding that instructor disagreement concentrates on weak prerequisite
 * pairs is why every proposal here lands on the review list at a bounded,
 * sub-canon confidence rather than being written to the graph: PLAN-
 * REVISION-1.md section 2b, "not every learned or LLM-proposed edge should
 * enter the graph at canon tier by default."
 *
 * `inferEdges` never applies a proposal. The CLI wrapper,
 * scripts/research-os/ingest/infer-edges.ts, has no `--apply` mode at all
 * (unlike academy-import.ts / canon-import.ts): every proposal here is a
 * review-list row for a human to confirm, add to canon-atom-map.json or a
 * source file by hand, or reject.
 */

import type { IngestNodeDraft, ReviewItem } from "./types";

/** Bounds for a proposal's own confidence score (bkt-ros ros-03 item 1's
 * flat CONFIDENCE_DEFAULTS.inferred, 0.5, is the systemwide fallback for
 * an 'inferred' edge with no finer-grained score; every proposal this
 * module computes gets a score inside this narrower, overlap-scaled band
 * instead, always below canon_map's 0.9 -- an inferred edge is never as
 * trusted as a curator's own match). */
export const INFERRED_CONFIDENCE_MIN = 0.3;
export const INFERRED_CONFIDENCE_MAX = 0.65;

/** Below this Jaccard overlap ratio, two summaries are not similar enough
 * to propose a prerequisite edge: keeps the per-branch scan from proposing
 * on shared stopwords or generic phrasing alone. */
export const OVERLAP_MIN_RATIO = 0.15;

const STOPWORDS = new Set([
  "the", "and", "for", "with", "that", "this", "from", "into", "over",
  "than", "then", "when", "what", "which", "where", "how", "why", "who",
  "are", "was", "were", "been", "being", "have", "has", "had", "does",
  "did", "can", "could", "would", "should", "will", "shall", "may",
  "might", "must", "not", "but", "its", "his", "her", "their", "our",
  "your", "you", "they", "them", "each", "some", "any", "all", "one",
  "two", "also", "more", "most", "such", "these", "those", "own", "out",
  "off", "about", "between", "through", "under", "again", "further",
  "here", "there", "same", "other", "per", "via", "including", "e.g",
  "eg", "etc", "part", "kind", "type", "example", "used", "use", "using",
]);

/** Lowercased, punctuation-stripped, stopword-and-short-word-filtered
 * token set of `text`. Deterministic and pure, so `inferEdges` output is
 * stable across runs on unchanged input. */
export function tokenize(text: string): Set<string> {
  const words = text
    .toLowerCase()
    .replace(/[^a-z0-9\s]+/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 2 && !STOPWORDS.has(w));
  return new Set(words);
}

/** |intersection| / |union| of two token sets; 0 for either empty set. */
export function jaccardOverlap(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 || b.size === 0) return 0;
  // .forEach rather than `for...of` over the Set directly: this repo's
  // tsconfig has no explicit `target` (TS defaults below ES2015), and
  // iterating a Set with `for...of` needs --downlevelIteration or an
  // ES2015+ target (TS2802), matching closure.ts's own convention.
  let intersection = 0;
  a.forEach((w) => {
    if (b.has(w)) intersection += 1;
  });
  const union = a.size + b.size - intersection;
  return union === 0 ? 0 : intersection / union;
}

/** overlapRatio (0..1) -> a confidence in [INFERRED_CONFIDENCE_MIN,
 * INFERRED_CONFIDENCE_MAX], linear in the overlap. Rounded to 2 places for
 * a stable, diffable review-list output. */
export function inferredConfidence(overlapRatio: number): number {
  const clampedRatio = Math.min(1, Math.max(0, overlapRatio));
  const raw = INFERRED_CONFIDENCE_MIN + (INFERRED_CONFIDENCE_MAX - INFERRED_CONFIDENCE_MIN) * clampedRatio;
  return Math.round(raw * 100) / 100;
}

export interface InferredEdgeProposal {
  fromSlug: string;
  toSlug: string;
  overlapRatio: number;
  confidence: number;
}

export interface InferEdgesInput {
  /** Every node the graph would already have (seed + Academy + canon
   * drafts): the pool this module proposes prerequisite edges within.
   * Nodes with no summary are skipped (nothing to compare). */
  nodes: IngestNodeDraft[];
  /** Existing `prerequisite` (fromSlug, toSlug) pairs, `"from|to"`-keyed:
   * a pair already covered by the seed, Academy, or canon importer is
   * never re-proposed. */
  existingPrerequisitePairs: Set<string>;
}

export interface InferEdgesResult {
  proposals: InferredEdgeProposal[];
  reviewList: ReviewItem[];
}

export function pairKey(fromSlug: string, toSlug: string): string {
  return `${fromSlug}|${toSlug}`;
}

/**
 * Proposes a `prerequisite` edge a -> b for every same-branch pair where
 * a.tier < b.tier strictly (tier ordering only: an easier node can be a
 * prerequisite of a harder one, never the reverse, and a tier tie carries
 * no ordering signal) and the two nodes' title-plus-summary token sets
 * overlap at or above OVERLAP_MIN_RATIO, skipping any pair already in
 * `existingPrerequisitePairs`. Comparison is scoped to one branch at a
 * time: a shared word across branches (e.g. two unrelated nodes that both
 * mention "energy") is not a prerequisite signal without a shared
 * curriculum context. Proposals sort by descending overlap ratio, then by
 * (fromSlug, toSlug), for a stable, diffable review-list output.
 */
export function inferEdges(input: InferEdgesInput): InferEdgesResult {
  const byBranch = new Map<string, IngestNodeDraft[]>();
  for (const n of input.nodes) {
    if (!n.summary) continue;
    if (!byBranch.has(n.branch)) byBranch.set(n.branch, []);
    byBranch.get(n.branch)!.push(n);
  }

  const proposals: InferredEdgeProposal[] = [];
  byBranch.forEach((branchNodes) => {
    const tokensBySlug = new Map(branchNodes.map((n) => [n.slug, tokenize(`${n.title} ${n.summary ?? ""}`)]));
    for (let i = 0; i < branchNodes.length; i++) {
      for (let j = i + 1; j < branchNodes.length; j++) {
        const x = branchNodes[i];
        const y = branchNodes[j];
        if (x.tier === y.tier) continue; // no ordering signal
        const a = x.tier < y.tier ? x : y;
        const b = x.tier < y.tier ? y : x;
        if (input.existingPrerequisitePairs.has(pairKey(a.slug, b.slug))) continue;

        const overlap = jaccardOverlap(tokensBySlug.get(a.slug)!, tokensBySlug.get(b.slug)!);
        if (overlap < OVERLAP_MIN_RATIO) continue;

        proposals.push({
          fromSlug: a.slug,
          toSlug: b.slug,
          overlapRatio: Math.round(overlap * 1000) / 1000,
          confidence: inferredConfidence(overlap),
        });
      }
    }
  });

  proposals.sort(
    (p, q) => q.overlapRatio - p.overlapRatio || p.fromSlug.localeCompare(q.fromSlug) || p.toSlug.localeCompare(q.toSlug),
  );

  const reviewList: ReviewItem[] = proposals.map((p) => ({
    id: `inferred_prerequisite_proposal:${p.fromSlug}:${p.toSlug}`,
    kind: "inferred_prerequisite_proposal",
    note: `Lexical overlap (${p.overlapRatio}) and tier ordering suggest "${p.fromSlug}" may be a prerequisite of "${p.toSlug}"; confidence ${p.confidence}, source inferred. Not written to the graph, a reviewer applies this by hand.`,
    detail: {
      fromSlug: p.fromSlug,
      toSlug: p.toSlug,
      overlapRatio: p.overlapRatio,
      confidence: p.confidence,
      confidenceSource: "inferred",
    },
  }));

  return { proposals, reviewList };
}
