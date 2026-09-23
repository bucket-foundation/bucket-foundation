import type { Decomposition } from "../primes";
import type { MedallionPlan } from "./plan";

export interface ReportNode {
  id: string;
  slug: string;
  title: string;
  kind: string;
  provenanceType: string | null;
}

export interface BackfillReport {
  nodes: number;
  lineage: { known: number; file: number; directory: number; upload: number; unknown: number; unknownByType: Record<string, number> };
  bronze: { sources: number; textWithheld: number };
  silver: { items: number; textStored: number; uncertain: number; hidden: number };
  transcript: {
    nodes: number;
    onDependencyPath: number;
    byType: Record<string, { nodes: number; onDependencyPath: number; deepest: number }>;
    deepest: number;
    deepestExamples: { slug: string; kind: string; depth: number }[];
  };
}

function bump(map: Record<string, number>, key: string): void {
  map[key] = (map[key] ?? 0) + 1;
}

export function summarizeBackfill(input: {
  nodes: ReportNode[];
  plan: MedallionPlan;
  decomposition: Map<string, Decomposition>;
  uploadNodesWithFile: Set<string>;
}): BackfillReport {
  const lineage = { known: 0, file: 0, directory: 0, upload: 0, unknown: 0, unknownByType: {} as Record<string, number> };
  const transcript: BackfillReport["transcript"] = { nodes: 0, onDependencyPath: 0, byType: {}, deepest: 0, deepestExamples: [] };
  const onPath: { slug: string; kind: string; depth: number }[] = [];

  for (const n of input.nodes) {
    const l = input.plan.lineage.get(n.slug);
    const type = n.provenanceType ?? "(none)";
    if (!l || l.status === "unknown" || (l.status === "upload" && !input.uploadNodesWithFile.has(n.id))) {
      lineage.unknown++;
      bump(lineage.unknownByType, l?.status === "upload" ? "import without a file" : type);
      continue;
    }
    lineage.known++;
    if (l.status === "upload") {
      lineage.upload++;
      continue;
    }
    if (l.status === "file") lineage.file++;
    else lineage.directory++;
    if (!l.transcript) continue;
    transcript.nodes++;
    const t = (transcript.byType[type] ??= { nodes: 0, onDependencyPath: 0, deepest: 0 });
    t.nodes++;
    const d = input.decomposition.get(n.id);
    if (!d || d.status === "unfactored") continue;
    transcript.onDependencyPath++;
    t.onDependencyPath++;
    t.deepest = Math.max(t.deepest, d.depth);
    onPath.push({ slug: n.slug, kind: n.kind, depth: d.depth });
  }
  onPath.sort((a, b) => b.depth - a.depth || (a.slug < b.slug ? -1 : 1));
  transcript.deepest = onPath[0]?.depth ?? 0;
  transcript.deepestExamples = onPath.slice(0, 5);

  const withheld = new Set(input.plan.bronze.filter((b) => !b.rights.allowIndex).map((b) => b.sourceId));
  return {
    nodes: input.nodes.length,
    lineage,
    bronze: { sources: input.plan.bronze.length, textWithheld: withheld.size },
    silver: {
      items: input.plan.silver.length,
      textStored: input.plan.silver.filter((s) => s.text !== null).length,
      uncertain: input.plan.silver.filter((s) => s.confidence >= 0.5 && s.confidence < 0.75).length,
      hidden: input.plan.silver.filter((s) => s.confidence < 0.5).length,
    },
    transcript,
  };
}
