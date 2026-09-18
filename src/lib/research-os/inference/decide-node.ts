/**
 * Decision logic for a missing-prime proposal (graph.node_proposals,
 * ros-prime 2, learning/research-os/PRIMES.md "Slice 2"). Pure: the route
 * at src/app/api/research-os/node-proposals persists whatever this returns.
 *
 * Approving creates one tier-0 concept node for the base idea and queues a
 * pending prerequisite proposal from it to every node that named it. Those
 * edge proposals carry no second model's check, so they arrive unconfirmed
 * and the reviewer decides each one on /research-os/edges like any other.
 * A decided proposal is never decided again.
 */
import { CONFIDENCE_SOURCE, UNCONFIRMED_CONFIDENCE, type ProposalRow } from "../decompose-further";

export type NodeProposalRecord = {
  status: "pending" | "approved" | "rejected";
  key: string;
  title: string;
  branch: string;
  justification: string;
  namedBy: string[];
  baseMatch: string | null;
  model: string;
};

export type NodeToCreate = {
  slug: string;
  title: string;
  kind: "concept";
  tier: 0;
  branch: string;
  summary: string;
  labels: Record<string, unknown>;
  provenance: Record<string, unknown>;
};

export type NodeDecision = {
  status: "approved" | "rejected";
  alreadyDecided: boolean;
  nodeToCreate?: NodeToCreate;
  edgeProposals?: ProposalRow[];
};

/** Slug for a base idea: `prime-` plus the normalized key, hyphenated. */
export function nodeSlug(key: string): string {
  const s = key
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
  return `prime-${s || "idea"}`;
}

/**
 * Pick the branch for the new node: the proposer's branch when the graph
 * has it, else the branch most of the naming targets sit in.
 */
export function chooseBranch(proposed: string, knownBranches: Set<string>, targetBranches: (string | null)[]): string {
  if (knownBranches.has(proposed)) return proposed;
  const counts = new Map<string, number>();
  for (const b of targetBranches) if (b) counts.set(b, (counts.get(b) ?? 0) + 1);
  const best = Array.from(counts).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0];
  return best ? best[0] : "01-mathematics";
}

export function decideNodeProposal(
  record: NodeProposalRecord,
  decision: "approved" | "rejected",
  ctx: { proposalId: string; branch: string; branchOf: Map<string, string | null> },
): NodeDecision {
  if (record.status !== "pending") return { status: record.status, alreadyDecided: true };
  if (decision === "rejected") return { status: "rejected", alreadyDecided: false };
  const slug = nodeSlug(record.key);
  const nodeToCreate: NodeToCreate = {
    slug,
    title: record.title,
    kind: "concept",
    tier: 0,
    branch: ctx.branch,
    summary: record.justification,
    labels: record.baseMatch ? { base_idea: record.baseMatch } : {},
    provenance: {
      type: "node_proposal",
      proposal_id: ctx.proposalId,
      proposed_by: CONFIDENCE_SOURCE,
      model: record.model,
      named_by: record.namedBy,
    },
  };
  const edgeProposals: ProposalRow[] = record.namedBy.map((target) => {
    const targetBranch = ctx.branchOf.get(target) ?? null;
    return {
      from_slug: slug,
      to_slug: target,
      branch: targetBranch,
      confidence: UNCONFIRMED_CONFIDENCE,
      confidence_source: CONFIDENCE_SOURCE,
      agreement: false,
      justification: `Named as a missing base idea while decomposing ${target}.`,
      secondary_justification: null,
      model: record.model,
      prompt_hash: `node-proposal:${ctx.proposalId}`.slice(0, 64),
      secondary_prompt_hash: null,
      status: "pending",
      impact: 0,
      cross_branch: targetBranch !== ctx.branch,
    };
  });
  return { status: "approved", alreadyDecided: false, nodeToCreate, edgeProposals };
}
