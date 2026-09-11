/**
 * Research OS for K-12, canon entry importer (bkt-ros, ingestion slice,
 * task item 2). Pure, dependency-free mapping from a bucket-canon dossier's
 * `primary-papers.yaml` record (src/lib/canon-primary.ts's `PrimaryPaper`,
 * the "served layer" src/app/api/research/route.ts already reads) onto a
 * graph.nodes / graph.edges draft. Scoped to bucket-canon/02-physics/ only,
 * per the ingestion task; nothing here assumes that scope, so a later pass
 * can widen it to another branch by passing a different `papers` list.
 *
 * No filesystem access here; scripts/research-os/ingest/canon-import.ts
 * calls src/lib/canon-primary.ts's `loadPrimaryPapers`/`authorsShort` (the
 * existing loader `/api/research` already depends on, reused rather than
 * re-implemented) and this module's `buildCanonImport`.
 *
 * Full contract: learning/research-os/INGESTION.md.
 */

import type { IngestNodeDraft, IngestEdgeDraft, IngestResult, ReviewItem } from "./types";
import { slugifyPart, CONFIDENCE_DEFAULTS } from "./types";
import { academyNodeSlug } from "./academy";

/** The subset of src/lib/canon-primary.ts's `PrimaryPaper` this importer
 * reads, restated locally so this module stays independent of that file's
 * own shape: a structural dependency rather than a nominal one, so any
 * object with these fields works, including a test fixture. */
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

/** One Academy atom the canon importer can link a `derives_from` edge to,
 * built from the same corpus files academy.ts imports, so
 * `academyNodeSlug(sourceFile, atomId)` here always agrees with the node
 * academy.ts writes. */
export interface AcademyAtomRef {
  branch: string;
  sourceFile: string;
  atomId: string;
  title: string;
}

/** scripts/research-os/ingest/canon-atom-map.json's shape: an explicit,
 * human-maintained override from a canon dossier's folder slug (the
 * "concept" a primary-papers.yaml record's directory names) to the
 * Academy atom it derives from. Never auto-written by an importer; a
 * reviewer edits this file by hand after reading the review list. */
export type CanonAtomMap = Record<string, { branch: string; atom_id: string; source_file?: string }>;

/** The Phase 0 seed's own tier sentinel (supabase/migrations/
 * 20260910000000_research_os_graph.sql's `tier` column comment): "90 as a
 * sentinel meaning adult, canon tier, outside any K-12 grade band." A
 * canon entry is exactly that population, so it reuses the same sentinel
 * rather than inventing a second one. */
export const CANON_TOP_TIER = 90;

/**
 * True for a canon dossier folder whose own name names a law, theorem, or
 * principle (INGESTION.md, "Canon entry kind heuristic"). Of this repo's
 * six bucket-canon/02-physics/ dossiers, exactly two match,
 * `bell-theorem` and `gauge-principle`, and both name a real, singular,
 * citable regularity distinct from the paper that established it (Bell's
 * theorem is not the same thing as Bell's 1964 paper; the paper is the
 * primary source, the theorem is the law it proves). The other four
 * (`quantum-mechanics`, `quantum-field-theory`, `special-relativity`,
 * `standard-model`) name a field or a body of theory rather than one
 * named result, so their own canon entry stays a `primary_source` node,
 * the bibliographic record itself, with no separate law to split out.
 */
export function isLawFolder(concept: string): boolean {
  return /theorem|principle|law/i.test(concept);
}

function shortId(id: string): string {
  return id.replace(/^bkt-/, "");
}

/** Deterministic on the record's own stable id (`bkt-sha1(doi)`, per
 * bucket-canon's own CANON_INDEX.md convention) plus its dossier folder,
 * this importer's idempotency key. */
export function canonEntrySlug(paper: CanonPaperLike): string {
  return `canon-${slugifyPart(paper.concept)}-${shortId(paper.id)}`;
}

/** Only emitted when `isLawFolder(paper.concept)`: the bibliographic
 * record backing that law, kept as a second node rather than folded into
 * the law node so a `cites` edge can point at it (a node cannot cite
 * itself; graph.edges forbids a self-loop). */
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

/**
 * The canon entry's own node: kind `law` when `isLawFolder`, else
 * `primary_source`; tier always `CANON_TOP_TIER` ("tier top" per the
 * ingestion task, matching the seed's own canon-bridge sentinel);
 * `branch` taken from the record itself (`paper.branch`), which the CLI
 * has already filtered to `02-physics` per this importer's scope.
 */
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

/** The bibliographic source node backing a law-kind entry, or `null` for
 * a primary_source-kind entry (which is already its own bibliographic
 * record; see `canonSourceSlug`'s own comment). */
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

/** `cites` edge from the law node to its own bibliographic source node;
 * `null` when the entry has no separate source node (primary_source-kind
 * entries already are their own DOI/URL source). */
export function buildCanonCitesEdge(paper: CanonPaperLike): IngestEdgeDraft | null {
  if (!isLawFolder(paper.concept)) return null;
  return {
    fromSlug: canonEntrySlug(paper),
    toSlug: canonSourceSlug(paper),
    kind: "cites",
    weight: null,
    provenance: { type: "canon_entry", concept: paper.concept },
    // bkt-ros ros-03 item 1: every edge this importer writes carries the
    // same canon_map confidence, curator-verified bibliographic linkage.
    confidence: CONFIDENCE_DEFAULTS.canon_map,
    confidenceSource: "canon_map",
  };
}

export interface AcademyAtomMatch {
  ref: AcademyAtomRef;
  matchedBy: "map" | "slug";
}

/**
 * Resolve a canon dossier's `derives_from` target, in order: (1)
 * canon-atom-map.json's explicit override, if present and it resolves to
 * a real Academy atom; (2) an exact match between the dossier's own
 * folder slug and an Academy atom's `id` (preferring a `02-physics`-branch
 * atom when the id exists in more than one branch); (3) no match. Never a
 * fuzzy or partial match: the ingestion task is explicit that an unmatched
 * entry goes to the review list rather than being guessed.
 */
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
  /** paper.id -> a short "Family & Family" / "Family et al." label,
   * src/lib/canon-primary.ts's own `authorsShort(paper)`. Passed in
   * rather than recomputed here so this module never needs that file's
   * `PrimaryPaper.authors` shape, only the label string it produces. */
  authorsLabelByPaperId: Map<string, string>;
  atomIndex: AcademyAtomRef[];
  overrideMap: CanonAtomMap;
}

/**
 * Every bucket-canon/02-physics/ canon entry (one per dossier folder
 * today; `papers` may carry more than one record per folder without any
 * change here, `canonEntrySlug` already disambiguates on the record's own
 * id) -> node drafts, cites/derives_from edge drafts, and a review item
 * for every entry whose Academy-atom match did not resolve.
 */
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
      // bkt-ros ros-03 item 1: a canon-atom-map.json / slug match is
      // reviewer-curated but a heuristic match, one notch below the
      // Academy corpus's own hand-authored `requires` edges.
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
