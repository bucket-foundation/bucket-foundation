/**
 * Research OS for K-12, the /research-os/edges review decision (bkt-ros
 * ros-13, task item 3). Pure transition function, no I/O, mirroring
 * src/lib/research-os/stages.ts's onTeacherReview/onProductionReview
 * shape: the API route (src/app/api/research-os/edges/route.ts) reads a
 * graph.edge_proposals row, calls this function, and persists whatever it
 * returns. Kept separate from stages.ts itself: an edge-proposal decision
 * changes graph structure alone, never graph.learner_node_state or an
 * EvidenceEvent.
 */

export type EdgeProposalStatus = "pending" | "approved" | "rejected";

export interface EdgeProposalRecord {
  status: EdgeProposalStatus;
  fromSlug: string;
  toSlug: string;
}

export type EdgeDecision = "approved" | "rejected";

/** graph.edges.confidence a reviewer's own approval carries -- a real
 * curator confirmation, one notch below seed/academy_requires' full 1.0
 * (learning/research-os/ROUTING.md's own confidence-source table), the
 * same value scripts/test-research-os-teacher-class.ts and this package's
 * other reviewer-approval paths already treat as "a human confirmed
 * this." */
export const TEACHER_APPROVED_CONFIDENCE = 0.95;

export interface EdgeToWrite {
  fromSlug: string;
  toSlug: string;
  kind: "prerequisite";
  confidence: number;
  confidenceSource: "teacher";
}

export interface DecideEdgeProposalResult {
  /** True when `proposal.status` was already something other than
   * "pending" before this call: the caller writes nothing new (no edge,
   * no status change), only reports the decision already on file --
   * task item 3's "both idempotent," approving or rejecting an
   * already-decided proposal a second time is a safe no-op, never a
   * duplicate edge or a second review record. */
  alreadyDecided: boolean;
  status: "approved" | "rejected";
  /** The edge for the caller to upsert into graph.edges, present only on
   * a FRESH "approved" decision. Null on reject, and null when
   * alreadyDecided is true (nothing new to write either way). */
  edgeToWrite: EdgeToWrite | null;
}

/**
 * Decides one edge proposal. `proposal.status` is read as it stood before
 * this call; the caller (the API route) is the one place that persists a
 * status change, so this function's own purity holds regardless of how
 * many times a caller re-derives it from a stale read.
 */
export function decideEdgeProposal(proposal: EdgeProposalRecord, decision: EdgeDecision): DecideEdgeProposalResult {
  if (proposal.status !== "pending") {
    return { alreadyDecided: true, status: proposal.status, edgeToWrite: null };
  }
  if (decision === "rejected") {
    return { alreadyDecided: false, status: "rejected", edgeToWrite: null };
  }
  return {
    alreadyDecided: false,
    status: "approved",
    edgeToWrite: {
      fromSlug: proposal.fromSlug,
      toSlug: proposal.toSlug,
      kind: "prerequisite",
      confidence: TEACHER_APPROVED_CONFIDENCE,
      confidenceSource: "teacher",
    },
  };
}
