import type { IngestEdgeDraft, IngestNodeDraft } from "../ingest/types";
import { sha256Hex } from "../evidence/text";
import { combineConfidence, HIDE_BELOW, type SilverDraft } from "./silver";

export const FACTOR_KINDS = new Set(["derives_from", "prerequisite"]);
export const MEDALLION_SOURCE = "medallion_lexical";
export const NODE_KEY_PREFIX = "medallion:";

export interface ImportSplit {
  goldNodes: IngestNodeDraft[];
  proposedNodes: IngestNodeDraft[];
  directEdges: IngestEdgeDraft[];
  factorEdges: IngestEdgeDraft[];
  factorEdgesInGold: IngestEdgeDraft[];
}

export function edgeKey(e: { fromSlug: string; toSlug: string; kind: string }): string {
  return `${e.fromSlug}|${e.toSlug}|${e.kind}`;
}

export function splitImport(nodes: IngestNodeDraft[], edges: IngestEdgeDraft[], existingSlugs: Set<string>, goldFactorEdges: Set<string> = new Set()): ImportSplit {
  const factor = edges.filter((e) => FACTOR_KINDS.has(e.kind));
  return {
    goldNodes: nodes.filter((n) => existingSlugs.has(n.slug)),
    proposedNodes: nodes.filter((n) => !existingSlugs.has(n.slug)),
    directEdges: edges.filter((e) => !FACTOR_KINDS.has(e.kind)),
    factorEdges: factor.filter((e) => !goldFactorEdges.has(edgeKey(e))),
    factorEdgesInGold: factor.filter((e) => goldFactorEdges.has(edgeKey(e))),
  };
}

export function factorAndDependent(edge: Pick<IngestEdgeDraft, "fromSlug" | "toSlug" | "kind">): { factor: string; dependent: string } {
  return edge.kind === "derives_from" ? { factor: edge.toSlug, dependent: edge.fromSlug } : { factor: edge.fromSlug, dependent: edge.toSlug };
}

export interface EdgeCandidate {
  edge: IngestEdgeDraft;
  silver: SilverDraft;
}

export function edgeCandidates(
  factorEdges: IngestEdgeDraft[],
  silverBySlug: Map<string, SilverDraft>,
  parser: string,
  parserRevision: string,
): { candidates: EdgeCandidate[]; unsilvered: IngestEdgeDraft[] } {
  const candidates: EdgeCandidate[] = [];
  const unsilvered: IngestEdgeDraft[] = [];
  for (const edge of factorEdges) {
    const { factor, dependent } = factorAndDependent(edge);
    const base = silverBySlug.get(dependent);
    if (!base) {
      unsilvered.push(edge);
      continue;
    }
    const parts = { source: base.confidence, match: clamp(edge.confidence ?? HIDE_BELOW) };
    candidates.push({
      edge,
      silver: {
        ...base,
        kind: "edge_candidate",
        parser,
        parser_revision: parserRevision,
        confidence: combineConfidence(parts),
        confidence_parts: parts,
        proposal: { slug: `${factor}->${dependent}`, kind: edge.kind, title: base.proposal.title, branch: base.proposal.branch },
        subject: `${factor}->${dependent}`,
      },
    });
  }
  return { candidates, unsilvered };
}

function clamp(v: number): number {
  return Math.min(1, Math.max(0, v));
}

export interface EdgeProposalInsert {
  from_slug: string;
  to_slug: string;
  branch: string;
  confidence: number;
  confidence_source: string;
  agreement: boolean;
  justification: string;
  model: string;
  prompt_hash: string;
  status: "pending";
  action: "add" | "demote";
  proposed_kind: string;
  silver_item_id: string | null;
}

function sharedTerms(provenance: Record<string, unknown> | undefined): string {
  const shared = provenance?.shared;
  return Array.isArray(shared) ? shared.filter((s) => typeof s === "string").join(", ") : "";
}

export function edgeProposalRow(label: string, edge: IngestEdgeDraft, silverItemId: string | null, branch: string, action: "add" | "demote" = "add"): EdgeProposalInsert {
  const { factor, dependent } = factorAndDependent(edge);
  const rule = typeof edge.provenance?.rule === "string" ? edge.provenance.rule : "lexical";
  const shared = sharedTerms(edge.provenance);
  const confidence = clamp(edge.confidence ?? HIDE_BELOW);
  return {
    from_slug: factor,
    to_slug: dependent,
    branch,
    confidence: confidence > 0 ? confidence : HIDE_BELOW,
    confidence_source: MEDALLION_SOURCE,
    agreement: false,
    justification: `${label} word match (${rule})${shared ? `: ${shared}` : ""}.`,
    model: "none",
    prompt_hash: sha256Hex(JSON.stringify([label, factor, dependent, edge.kind, rule])).slice(0, 64),
    status: "pending",
    action,
    proposed_kind: edge.kind,
    silver_item_id: silverItemId,
  };
}

export interface NodeProposalInsert {
  key: string;
  title: string;
  branch: string;
  justification: string;
  summary: string | null;
  model: string;
  draft: IngestNodeDraft;
  silver_item_id: string | null;
}

export function nodeProposalRow(label: string, draft: IngestNodeDraft, silver: Pick<SilverDraft, "confidence"> | null, silverItemId: string | null): NodeProposalInsert {
  return {
    key: `${NODE_KEY_PREFIX}${draft.slug}`,
    title: draft.title,
    branch: draft.branch,
    justification: silver ? `New ${draft.kind} from ${label}, silver confidence ${silver.confidence}.` : `New ${draft.kind} from ${label}, no silver item.`,
    summary: draft.summary,
    model: "none",
    draft,
    silver_item_id: silverItemId,
  };
}

export function queueable(silver: Pick<SilverDraft, "confidence">): boolean {
  return silver.confidence >= HIDE_BELOW;
}
