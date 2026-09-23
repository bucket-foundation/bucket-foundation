import type { IngestNodeDraft, ReviewItem } from "./types";

export const INFERRED_CONFIDENCE_MIN = 0.3;
export const INFERRED_CONFIDENCE_MAX = 0.65;

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

export function tokenize(text: string): Set<string> {
  const words = text
    .toLowerCase()
    .replace(/[^a-z0-9\s]+/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 2 && !STOPWORDS.has(w));
  return new Set(words);
}

export function jaccardOverlap(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 || b.size === 0) return 0;
  let intersection = 0;
  a.forEach((w) => {
    if (b.has(w)) intersection += 1;
  });
  const union = a.size + b.size - intersection;
  return union === 0 ? 0 : intersection / union;
}

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
  nodes: IngestNodeDraft[];
  existingPrerequisitePairs: Set<string>;
}

export interface InferEdgesResult {
  proposals: InferredEdgeProposal[];
  reviewList: ReviewItem[];
}

export function pairKey(fromSlug: string, toSlug: string): string {
  return `${fromSlug}|${toSlug}`;
}

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
        if (x.tier === y.tier) continue;
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
