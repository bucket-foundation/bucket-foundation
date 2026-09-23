import type { Decomposition } from "../primes";
import type { MedallionPlan } from "./plan";
import { isTranscriptPath } from "./paths";

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

export interface LineageSummaryInput {
  nodes: { id: string; slug: string | null; createdAt: string; provenanceType: string | null }[];
  lineage: { node_id: string | null; silver_item_id: string; promoted_by: string; promoted_at: string }[];
  silverSource: Map<string, string>;
  pathsBySource: Map<string, string[]>;
  decomposition: Map<string, Decomposition>;
  pending: { action: string }[];
  withdrawnQueue: number;
}

export interface LineageSummary {
  nodes: number;
  byPromotedBy: { backfill: number; importer: number; reviewer: number };
  none: { beforeStage2: number; afterStage2: number };
  stage2Since: string | null;
  transcript: {
    nodes: number;
    onDependencyPath: number;
    deepest: number;
    byType: Record<string, { nodes: number; onDependencyPath: number; deepest: number }>;
    deepestNodes: { slug: string | null; depth: number }[];
  };
  review: { addPending: number; demotePending: number; withdrawnQueue: number };
}

export function lineageSummary(input: LineageSummaryInput): LineageSummary {
  const rowsByNode = new Map<string, LineageSummaryInput["lineage"]>();
  for (const l of input.lineage) if (l.node_id) rowsByNode.set(l.node_id, [...(rowsByNode.get(l.node_id) ?? []), l]);
  const backfillTimes = input.lineage.filter((l) => l.promoted_by === "backfill").map((l) => l.promoted_at).sort();
  const since = backfillTimes[0] ?? null;
  const byPromotedBy = { backfill: 0, importer: 0, reviewer: 0 };
  const none = { beforeStage2: 0, afterStage2: 0 };
  const transcript: LineageSummary["transcript"] = { nodes: 0, onDependencyPath: 0, deepest: 0, byType: {}, deepestNodes: [] };
  const onPath: { slug: string | null; depth: number }[] = [];
  for (const n of input.nodes) {
    const rows = rowsByNode.get(n.id) ?? [];
    if (!rows.length) {
      if (since && n.createdAt > since) none.afterStage2++;
      else none.beforeStage2++;
      continue;
    }
    for (const k of ["backfill", "importer", "reviewer"] as const) if (rows.some((r) => r.promoted_by === k)) byPromotedBy[k]++;
    const fromTranscript = rows.some((r) => {
      const source = input.silverSource.get(r.silver_item_id);
      return !!source && (input.pathsBySource.get(source) ?? []).some(isTranscriptPath);
    });
    if (!fromTranscript) continue;
    const type = n.provenanceType ?? "(none)";
    const t = (transcript.byType[type] ??= { nodes: 0, onDependencyPath: 0, deepest: 0 });
    transcript.nodes++;
    t.nodes++;
    const d = input.decomposition.get(n.id);
    if (!d || d.status === "unfactored") continue;
    transcript.onDependencyPath++;
    t.onDependencyPath++;
    t.deepest = Math.max(t.deepest, d.depth);
    onPath.push({ slug: n.slug, depth: d.depth });
  }
  onPath.sort((a, b) => b.depth - a.depth || String(a.slug).localeCompare(String(b.slug)));
  transcript.deepest = onPath[0]?.depth ?? 0;
  transcript.deepestNodes = onPath.slice(0, 10);
  return {
    nodes: input.nodes.length,
    byPromotedBy,
    none,
    stage2Since: since,
    transcript,
    review: {
      addPending: input.pending.filter((p) => p.action === "add").length,
      demotePending: input.pending.filter((p) => p.action === "demote").length,
      withdrawnQueue: input.withdrawnQueue,
    },
  };
}
