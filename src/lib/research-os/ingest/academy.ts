import type { IngestNodeDraft, IngestEdgeDraft, IngestResult, ReviewItem } from "./types";
import { slugifyPart, CONFIDENCE_DEFAULTS } from "./types";

export interface AcademyAtom {
  id: string;
  title: string;
  type?: string | null;
  summary?: string | null;
  requires?: string[];
}

export interface AcademyCorpusJson {
  meta?: { branch?: string; version?: string; [k: string]: unknown };
  atoms?: unknown;
}

export interface AcademyCorpusFile {
  sourceFile: string;
  branch: string;
  atoms: AcademyAtom[];
}

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

export const ACADEMY_TIER_BASE = 13;

export function academyNodeSlug(sourceFile: string, atomId: string): string {
  const base = sourceFile.replace(/^.*\//, "").replace(/\.json$/, "");
  return `academy-${slugifyPart(base)}-${slugifyPart(atomId)}`;
}

export function mapAtomKind(type: string | null | undefined): "law" | "concept" {
  return type === "law" || type === "theorem" ? "law" : "concept";
}

export interface RequiresDepthResult {
  depth: Map<string, number>;
  cyclic: string[];
  unresolved: [string, string][];
}

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
      if (!file.atoms.some((x) => x.id === r)) continue;
      edges.push({
        fromSlug: academyNodeSlug(file.sourceFile, r),
        toSlug: academyNodeSlug(file.sourceFile, a.id),
        kind: "prerequisite",
        weight: 1.0,
        provenance: { type: "academy_atom", source: file.sourceFile },
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
