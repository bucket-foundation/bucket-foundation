/**
 * Research OS for K-12, Academy corpus importer (bkt-ros, ingestion slice,
 * task item 1). Pure, dependency-free mapping from learning/app/corpus/
 * *.json's atom shape onto graph.nodes / graph.edges drafts (types.ts).
 * No filesystem access here; scripts/research-os/ingest/academy-import.ts
 * reads the corpus files and calls buildAcademyImport with the parsed JSON.
 *
 * Full contract: learning/research-os/INGESTION.md.
 */

import type { IngestNodeDraft, IngestEdgeDraft, IngestResult, ReviewItem } from "./types";
import { slugifyPart, CONFIDENCE_DEFAULTS } from "./types";

/** An atom entry as learning/app/corpus/*.json's `atoms` array holds it.
 * Only the fields this importer reads; the corpus carries many more
 * (lesson, depths, quiz, resources, ...) that Research OS's graph does not
 * model and this importer leaves untouched on disk. */
export interface AcademyAtom {
  id: string;
  title: string;
  type?: string | null;
  summary?: string | null;
  requires?: string[];
}

/** One learning/app/corpus/*.json file, already `JSON.parse`d. */
export interface AcademyCorpusJson {
  meta?: { branch?: string; version?: string; [k: string]: unknown };
  atoms?: unknown;
}

export interface AcademyCorpusFile {
  /** Repo-relative path, e.g. "learning/app/corpus/02-physics.json";
   * this importer's idempotency key alongside each atom's own `id`
   * (INGESTION.md, "Idempotent on (source, atom_id)"). */
  sourceFile: string;
  branch: string;
  atoms: AcademyAtom[];
}

/**
 * True for a corpus file this importer can read: a `meta.branch` string
 * plus an `atoms` array whose entries carry a `title`. This is what
 * separates the 487-atom, seven-branch-plus-biophysics population the
 * review calls "the closest existing thing to a prerequisite DAG" from
 * this same directory's three language-learning corpora (lang-core.json,
 * lang-cognates.json, lang-phrases.json) and the branch manifest
 * (index.json): the language files use a `gloss`/`concepts`/`phrases`
 * shape with no `title` field, and index.json has no `atoms` array at all.
 * A structural check here, rather than a hardcoded file-name allow-list,
 * so a ninth branch file dropped into the corpus directory is picked up
 * without an importer change.
 */
export function isAcademyCorpusFile(json: unknown): json is Required<Pick<AcademyCorpusJson, "meta" | "atoms">> & {
  meta: { branch: string };
  atoms: AcademyAtom[];
} {
  if (!json || typeof json !== "object") return false;
  const j = json as AcademyCorpusJson;
  if (!j.meta || typeof j.meta.branch !== "string" || !j.meta.branch) return false;
  if (!Array.isArray(j.atoms) || j.atoms.length === 0) return false;
  return j.atoms.every((a) => typeof (a as AcademyAtom)?.id === "string" && typeof (a as AcademyAtom)?.title === "string");
}

/** Tier base for an imported Academy atom (INGESTION.md, "Tier heuristic").
 * Academy's corpus is not grade-banded (no atom carries a `level` field;
 * confirmed against all 487 atoms across the eight importable files), and
 * its content sits above the K-12 grade-level tiers (3-12) the Phase 0
 * seed uses for path nodes. `ACADEMY_TIER_BASE` starts the Academy
 * population one above that range, plus a topological-depth offset
 * (computeRequiresDepth below) that keeps every atom strictly below the
 * canon-bridge sentinel (90, canon.ts's `CANON_TOP_TIER`) even at the
 * corpus's deepest chain (16 hops, 02-physics.json and 06-cosmology.json). */
export const ACADEMY_TIER_BASE = 13;

/** Deterministic on (source file, atom id): the importer's own idempotency
 * key (INGESTION.md, "Idempotent on (source, atom_id)"). Two atoms sharing
 * an `id` across different branch files (seven such pairs exist in the
 * current corpus, e.g. `godel-incompleteness` in both 01-mathematics.json
 * and 04-information.json) resolve to two distinct slugs, since every
 * `requires` reference the corpus carries resolves within its own source
 * file only (verified against the full 487-atom corpus: zero cross-file
 * `requires` references), so no ambiguity ever needs resolving here. */
export function academyNodeSlug(sourceFile: string, atomId: string): string {
  const base = sourceFile.replace(/^.*\//, "").replace(/\.json$/, "");
  return `academy-${slugifyPart(base)}-${slugifyPart(atomId)}`;
}

/**
 * `graph.nodes.kind` for an imported atom, from the atom's own `type`
 * field (INGESTION.md, "Kind heuristic"). Restricted to `law` or `concept`
 * per the ingestion task: `type: "law"` and `type: "theorem"` (a proven
 * regularity, the same bucket `law`'s own node-kind definition names,
 * "a general, tested regularity") map to `law`; every other observed type
 * (`concept`, `equation`, `result`, `method`, `definition`) and a missing
 * type both map to `concept`, the atom-tier default. This never guesses a
 * `fact`, `derivation`, `primary_source`, or `artifact` kind for an
 * Academy atom; those stay reserved for the canon importer and for a
 * future, more granular pass.
 */
export function mapAtomKind(type: string | null | undefined): "law" | "concept" {
  return type === "law" || type === "theorem" ? "law" : "concept";
}

export interface RequiresDepthResult {
  /** atom id -> topological depth (0 = no resolvable `requires`). */
  depth: Map<string, number>;
  /** atom ids that sit on a `requires` cycle; excluded from `depth`,
   * reported as `prerequisite_cycle` review items by the caller. */
  cyclic: string[];
  /** [atomId, unresolvedRequiredId] pairs; reported as `unresolved_requires`
   * review items by the caller. Never observed against the shipped corpus. */
  unresolved: [string, string][];
}

/**
 * Topological depth of every atom in one file's `requires` DAG (0 for a
 * root, `1 + max(depth of each resolvable prerequisite)` otherwise). This
 * is the tier heuristic's other half (INGESTION.md): depth-based tiering
 * is monotonic by construction, since a dependent atom's depth is always
 * strictly greater than every one of its prerequisites' depths, which is
 * exactly the invariant task item 3's tier-monotonicity check verifies.
 * Uses an explicit stack, keeping a pathological chain off the call
 * stack. A cycle is detected via a gray/black three-color walk; its
 * members stay excluded from `depth` instead of receiving an arbitrary
 * value.
 */
export function computeRequiresDepth(atoms: AcademyAtom[]): RequiresDepthResult {
  const byId = new Map(atoms.map((a) => [a.id, a] as const));
  const depth = new Map<string, number>();
  const unresolved: [string, string][] = [];
  const WHITE = 0,
    GRAY = 1,
    BLACK = 2;
  const color = new Map<string, number>(atoms.map((a) => [a.id, WHITE]));
  const cyclicSet = new Set<string>();

  function resolvableRequires(a: AcademyAtom): string[] {
    const out: string[] = [];
    for (const r of a.requires ?? []) {
      if (byId.has(r)) out.push(r);
      else unresolved.push([a.id, r]);
    }
    return out;
  }

  for (const start of atoms) {
    if (color.get(start.id) !== WHITE) continue;
    // Explicit-stack DFS with a per-frame iterator index, the standard
    // iterative post-order walk: push on first visit (GRAY), pop and
    // finalize (BLACK, depth computed) once every child is done.
    const stack: { id: string; reqs: string[]; i: number }[] = [];
    stack.push({ id: start.id, reqs: resolvableRequires(start), i: 0 });
    color.set(start.id, GRAY);
    while (stack.length > 0) {
      const frame = stack[stack.length - 1];
      if (frame.i < frame.reqs.length) {
        const childId = frame.reqs[frame.i];
        frame.i += 1;
        const childColor = color.get(childId);
        if (childColor === GRAY) {
          // Cycle: every node currently on the stack from childId down is
          // part of it (or feeds one); mark them all rather than guess
          // which single edge to blame.
          const idx = stack.findIndex((f) => f.id === childId);
          for (let k = idx; k < stack.length; k++) cyclicSet.add(stack[k].id);
          cyclicSet.add(childId);
          continue;
        }
        if (childColor === WHITE) {
          color.set(childId, GRAY);
          const child = byId.get(childId) as AcademyAtom;
          stack.push({ id: childId, reqs: resolvableRequires(child), i: 0 });
        }
        continue;
      }
      // All resolvable requires visited; finalize this frame.
      stack.pop();
      color.set(frame.id, BLACK);
      if (!cyclicSet.has(frame.id)) {
        const d = frame.reqs.length === 0 ? 0 : 1 + Math.max(...frame.reqs.map((r) => depth.get(r) ?? 0));
        depth.set(frame.id, d);
      }
    }
  }

  return { depth, cyclic: Array.from(cyclicSet), unresolved };
}

function reviewId(kind: string, ...parts: string[]): string {
  return [kind, ...parts].join(":");
}

/**
 * One file's atoms -> node drafts, prerequisite edge drafts, and any
 * review items (a `requires` cycle or an unresolved `requires` id; neither
 * occurs against the shipped 487-atom corpus, both handled rather than
 * assumed impossible).
 */
export function buildAcademyFileImport(file: AcademyCorpusFile): IngestResult {
  const { depth, cyclic, unresolved } = computeRequiresDepth(file.atoms);
  const cyclicSet = new Set(cyclic);
  const reviewList: ReviewItem[] = [];

  const nodes: IngestNodeDraft[] = file.atoms.map((a) => {
    const d = cyclicSet.has(a.id) ? 0 : (depth.get(a.id) ?? 0);
    if (cyclicSet.has(a.id)) {
      reviewList.push({
        id: reviewId("prerequisite_cycle", file.sourceFile, a.id),
        kind: "prerequisite_cycle",
        note: `Atom "${a.id}" in ${file.sourceFile} sits on a requires cycle; tier fell back to ACADEMY_TIER_BASE instead of a topological depth.`,
        detail: { sourceFile: file.sourceFile, atomId: a.id },
      });
    }
    return {
      slug: academyNodeSlug(file.sourceFile, a.id),
      title: a.title,
      kind: mapAtomKind(a.type),
      tier: ACADEMY_TIER_BASE + d,
      branch: file.branch,
      summary: a.summary ?? null,
      labels: { en: { title: a.title } },
      provenance: {
        type: "academy_atom",
        source: file.sourceFile,
        atom_id: a.id,
        branch: file.branch,
        corpus_type: a.type ?? null,
      },
    };
  });

  const edges: IngestEdgeDraft[] = [];
  for (const a of file.atoms) {
    for (const r of a.requires ?? []) {
      if (!file.atoms.some((x) => x.id === r)) continue; // unresolved, reported below
      edges.push({
        fromSlug: academyNodeSlug(file.sourceFile, r),
        toSlug: academyNodeSlug(file.sourceFile, a.id),
        kind: "prerequisite",
        weight: 1.0,
        provenance: { type: "academy_atom", source: file.sourceFile },
        // bkt-ros ros-03 item 1: an Academy `requires` reference is
        // curator-authored, full confidence.
        confidence: CONFIDENCE_DEFAULTS.academy_requires,
        confidenceSource: "academy_requires",
      });
    }
  }

  for (const [atomId, missing] of unresolved) {
    reviewList.push({
      id: reviewId("unresolved_requires", file.sourceFile, atomId, missing),
      kind: "unresolved_requires",
      note: `Atom "${atomId}" in ${file.sourceFile} requires "${missing}", which is not defined in the same file. No edge written.`,
      detail: { sourceFile: file.sourceFile, atomId, missingRequiresId: missing },
    });
  }

  return {
    nodes,
    edges,
    reviewList,
    stats: { nodes: nodes.length, edges: edges.length, cyclicAtoms: cyclic.length, unresolvedRequires: unresolved.length },
  };
}

/** Every importable corpus file's import, concatenated. */
export function buildAcademyImport(files: AcademyCorpusFile[]): IngestResult {
  const nodes: IngestNodeDraft[] = [];
  const edges: IngestEdgeDraft[] = [];
  const reviewList: ReviewItem[] = [];
  for (const file of files) {
    const result = buildAcademyFileImport(file);
    nodes.push(...result.nodes);
    edges.push(...result.edges);
    reviewList.push(...result.reviewList);
  }
  return {
    nodes,
    edges,
    reviewList,
    stats: {
      files: files.length,
      nodes: nodes.length,
      edges: edges.length,
      reviewItems: reviewList.length,
    },
  };
}
