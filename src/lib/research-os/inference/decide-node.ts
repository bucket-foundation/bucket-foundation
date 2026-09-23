import { CONFIDENCE_SOURCE, confidenceFor, type ProposalRow } from "../decompose-further";

export type NodeProposalRecord = {
  status: "pending" | "approved" | "rejected";
  key: string;
  title: string;
  branch: string;
  justification: string;
  summary: string | null;
  namedBy: string[];
  aliases: string[];
  reasons: Record<string, string>;
  baseMatch: string | null;
  model: string;
};

export type NodeToCreate = {
  slug: string;
  title: string;
  kind: "concept";
  tier: number;
  branch: string;
  summary: string;
  labels: Record<string, { title: string; summary: string }>;
  provenance: Record<string, unknown>;
};

export type NodeDecision = {
  status: "approved" | "rejected";
  alreadyDecided: boolean;
  error?: "summary_required";
  nodeToCreate?: NodeToCreate;
  edgeProposals?: ProposalRow[];
};

export type NodeOverrides = { title?: string; summary?: string; branch?: string };

export const DEFAULT_TIER = 13;

export function nodeSlug(key: string): string {
  const s = key
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
  return `concept-${s || "idea"}`;
}

export function chooseBranch(proposed: string, knownBranches: Set<string>, targetBranches: (string | null)[]): string {
  if (knownBranches.has(proposed)) return proposed;
  const counts = new Map<string, number>();
  for (const b of targetBranches) if (b) counts.set(b, (counts.get(b) ?? 0) + 1);
  const best = Array.from(counts).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0];
  return best ? best[0] : "01-mathematics";
}

export function chooseTier(targetTiers: (number | null | undefined)[], lowestTier?: number | null): number {
  const known = targetTiers.filter((t): t is number => typeof t === "number" && Number.isFinite(t));
  if (known.length) return Math.min(...known);
  return typeof lowestTier === "number" && Number.isFinite(lowestTier) ? lowestTier : DEFAULT_TIER;
}

export function decideNodeProposal(
  record: NodeProposalRecord,
  decision: "approved" | "rejected",
  ctx: {
    proposalId: string;
    branch: string;
    branchOf: Map<string, string | null>;
    tierOf: Map<string, number | null>;
    impactOf?: Map<string, number>;
    overrides?: NodeOverrides;
    lowestTier?: number | null;
  },
): NodeDecision {
  if (record.status !== "pending") return { status: record.status, alreadyDecided: true };
  if (decision === "rejected") return { status: "rejected", alreadyDecided: false };
  const slug = nodeSlug(record.key);
  const title = ctx.overrides?.title?.trim() || record.title;
  const summary = ctx.overrides?.summary?.trim() || record.summary?.trim() || "";
  if (!summary) return { status: "approved", alreadyDecided: false, error: "summary_required" };
  const branch = ctx.overrides?.branch?.trim() || ctx.branch;
  const nodeToCreate: NodeToCreate = {
    slug,
    title,
    kind: "concept",
    tier: chooseTier(record.namedBy.map((t) => ctx.tierOf.get(t)), ctx.lowestTier),
    branch,
    summary,
    labels: { en: { title, summary } },
    provenance: {
      type: "node_proposal",
      proposal_id: ctx.proposalId,
      proposed_by: CONFIDENCE_SOURCE,
      model: record.model,
      named_by: record.namedBy,
      aliases: record.aliases,
      base_idea_hint: record.baseMatch,
    },
  };
  const edgeProposals: ProposalRow[] = record.namedBy.map((target) => {
    const targetBranch = ctx.branchOf.get(target) ?? null;
    return {
      from_slug: slug,
      to_slug: target,
      branch: targetBranch,
      confidence: confidenceFor("unchecked"),
      confidence_source: CONFIDENCE_SOURCE,
      agreement: false,
      justification: record.reasons[target] || `Named as a missing base idea while decomposing ${target}.`,
      secondary_justification: null,
      model: record.model,
      prompt_hash: `node-proposal:${ctx.proposalId}`.slice(0, 64),
      secondary_prompt_hash: null,
      status: "pending",
      impact: ctx.impactOf?.get(target) ?? 0,
      cross_branch: targetBranch !== branch,
      verification: "unchecked",
      origin: "base_idea",
      refd: null,
    };
  });
  return { status: "approved", alreadyDecided: false, nodeToCreate, edgeProposals };
}
