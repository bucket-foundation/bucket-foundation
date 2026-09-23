import type { IngestNodeDraft, IngestEdgeDraft, IngestResult, ReviewItem } from "./types";
import { slugifyPart, CONFIDENCE_DEFAULTS } from "./types";
import { academyNodeSlug } from "./academy";

export interface CanonPaperLike {
  id: string;
  branch: string;
  concept: string;
  title: string;
  year: number | null;
  venueName: string;
  doi: string;
  canonicalUrl: string;
  canonScore: number;
}

export interface AcademyAtomRef {
  branch: string;
  sourceFile: string;
  atomId: string;
  title: string;
}

export type CanonAtomMap = Record<string, { branch: string; atom_id: string; source_file?: string }>;

export const CANON_TOP_TIER = 90;

export function isLawFolder(concept: string): boolean {
  return /theorem|principle|law/i.test(concept);
}

function shortId(id: string): string {
  return id.replace(/^bkt-/, "");
}

export function canonEntrySlug(paper: CanonPaperLike): string {
  return `canon-${slugifyPart(paper.concept)}-${shortId(paper.id)}`;
}

export function canonSourceSlug(paper: CanonPaperLike): string {
  return `canon-source-${slugifyPart(paper.concept)}-${shortId(paper.id)}`;
}

function canonProvenance(paper: CanonPaperLike, authorsLabel: string, type: "canon_entry" | "primary_source"): Record<string, unknown> {
  return {
    type,
    source: `bucket-canon/${paper.branch}/${paper.concept}/primary-papers.yaml`,
    concept: paper.concept,
    paper_id: paper.id,
    doi: paper.doi || null,
    canonical_url: paper.canonicalUrl || null,
    year: paper.year,
    authors: authorsLabel || null,
    venue: paper.venueName || null,
    canon_score: paper.canonScore,
  };
}

export function buildCanonEntryNode(paper: CanonPaperLike, authorsLabel: string): IngestNodeDraft {
  const law = isLawFolder(paper.concept);
  return {
    slug: canonEntrySlug(paper),
    title: law ? paper.concept.replace(/-/g, " ") : paper.title,
    kind: law ? "law" : "primary_source",
    tier: CANON_TOP_TIER,
    branch: paper.branch,
    summary: law ? `${paper.concept.replace(/-/g, " ")}, established in ${paper.title}${paper.year ? ` (${paper.year})` : ""}.` : paper.title,
    labels: { en: { title: law ? paper.concept.replace(/-/g, " ") : paper.title } },
    provenance: canonProvenance(paper, authorsLabel, "canon_entry"),
  };
}

export function buildCanonSourceNode(paper: CanonPaperLike, authorsLabel: string): IngestNodeDraft | null {
  if (!isLawFolder(paper.concept)) return null;
  return {
    slug: canonSourceSlug(paper),
    title: paper.title,
    kind: "primary_source",
    tier: CANON_TOP_TIER,
    branch: paper.branch,
    summary: paper.title,
    labels: { en: { title: paper.title } },
    provenance: canonProvenance(paper, authorsLabel, "primary_source"),
  };
}

export function buildCanonCitesEdge(paper: CanonPaperLike): IngestEdgeDraft | null {
  if (!isLawFolder(paper.concept)) return null;
  return {
    fromSlug: canonEntrySlug(paper),
    toSlug: canonSourceSlug(paper),
    kind: "cites",
    weight: null,
    provenance: { type: "canon_entry", concept: paper.concept },
    confidence: CONFIDENCE_DEFAULTS.canon_map,
    confidenceSource: "canon_map",
  };
}

export interface AcademyAtomMatch {
  ref: AcademyAtomRef;
  matchedBy: "map" | "slug";
}

export function matchAcademyAtom(
  concept: string,
  atomIndex: AcademyAtomRef[],
  overrideMap: CanonAtomMap,
): AcademyAtomMatch | "unresolved_map_entry" | null {
  const override = overrideMap[concept];
  if (override) {
    const found = atomIndex.find(
      (a) => a.branch === override.branch && a.atomId === override.atom_id && (!override.source_file || a.sourceFile === override.source_file),
    );
    return found ? { ref: found, matchedBy: "map" } : "unresolved_map_entry";
  }
  const candidates = atomIndex.filter((a) => a.atomId === concept);
  if (candidates.length === 0) return null;
  const preferred = candidates.find((a) => a.branch === "02-physics") ?? candidates[0];
  return { ref: preferred, matchedBy: "slug" };
}

function reviewId(kind: string, ...parts: string[]): string {
  return [kind, ...parts].join(":");
}

export interface BuildCanonImportInput {
  papers: CanonPaperLike[];
  authorsLabelByPaperId: Map<string, string>;
  atomIndex: AcademyAtomRef[];
  overrideMap: CanonAtomMap;
}

export function buildCanonImport(input: BuildCanonImportInput): IngestResult {
  const nodes: IngestNodeDraft[] = [];
  const edges: IngestEdgeDraft[] = [];
  const reviewList: ReviewItem[] = [];

  for (const paper of input.papers) {
    const authorsLabel = input.authorsLabelByPaperId.get(paper.id) ?? "";
    nodes.push(buildCanonEntryNode(paper, authorsLabel));
    const sourceNode = buildCanonSourceNode(paper, authorsLabel);
    if (sourceNode) nodes.push(sourceNode);
    const citesEdge = buildCanonCitesEdge(paper);
    if (citesEdge) edges.push(citesEdge);

    const match = matchAcademyAtom(paper.concept, input.atomIndex, input.overrideMap);
    if (match === "unresolved_map_entry") {
      const override = input.overrideMap[paper.concept];
      reviewList.push({
        id: reviewId("unresolved_map_entry", paper.concept),
        kind: "unresolved_map_entry",
        note: `canon-atom-map.json maps "${paper.concept}" to Academy atom "${override.atom_id}" (branch ${override.branch}), which was not found in the loaded corpus.`,
        detail: { concept: paper.concept, paperId: paper.id, override },
      });
      continue;
    }
    if (match === null) {
      reviewList.push({
        id: reviewId("unmatched_derives_from", paper.concept, paper.id),
        kind: "unmatched_derives_from",
        note: `Canon entry "${paper.concept}" (${paper.title}) has no Academy atom whose id matches its dossier slug, and no canon-atom-map.json override. No derives_from edge written.`,
        detail: { concept: paper.concept, paperId: paper.id, title: paper.title },
      });
      continue;
    }
    edges.push({
      fromSlug: canonEntrySlug(paper),
      toSlug: academyNodeSlug(match.ref.sourceFile, match.ref.atomId),
      kind: "derives_from",
      weight: null,
      provenance: { type: "canon_entry", concept: paper.concept, matched_by: match.matchedBy },
      confidence: CONFIDENCE_DEFAULTS.canon_map,
      confidenceSource: "canon_map",
    });
  }

  return {
    nodes,
    edges,
    reviewList,
    stats: {
      entries: input.papers.length,
      nodes: nodes.length,
      edges: edges.length,
      reviewItems: reviewList.length,
    },
  };
}
