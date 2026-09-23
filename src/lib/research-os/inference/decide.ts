export type EdgeProposalStatus = "pending" | "approved" | "rejected";

export interface EdgeProposalRecord {
  status: EdgeProposalStatus;
  fromSlug: string;
  toSlug: string;
}

export type EdgeDecision = "approved" | "rejected";

export const TEACHER_APPROVED_CONFIDENCE = 0.95;

export type ApprovedKind = "prerequisite" | "derives_from";

export interface EdgeToWrite {
  fromSlug: string;
  toSlug: string;
  kind: ApprovedKind;
  confidence: number;
  confidenceSource: "teacher";
}

export interface DecideEdgeProposalResult {
  alreadyDecided: boolean;
  status: "approved" | "rejected";
  edgeToWrite: EdgeToWrite | null;
}

export function decideEdgeProposal(proposal: EdgeProposalRecord, decision: EdgeDecision, kind: ApprovedKind = "prerequisite"): DecideEdgeProposalResult {
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
      fromSlug: kind === "derives_from" ? proposal.toSlug : proposal.fromSlug,
      toSlug: kind === "derives_from" ? proposal.fromSlug : proposal.toSlug,
      kind,
      confidence: TEACHER_APPROVED_CONFIDENCE,
      confidenceSource: "teacher",
    },
  };
}
