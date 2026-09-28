import { edgeProposalRow, type EdgeProposalInsert } from "./proposals";

export interface DemotionEdge {
  tagSlug: string;
  tagBranch: string;
  atomSlug: string;
  confidence: number;
  provenance: Record<string, unknown>;
  silverItemId: string | null;
}

export function demotionRows(edges: DemotionEdge[]): EdgeProposalInsert[] {
  return edges
    .map((e) =>
      edgeProposalRow("canon-all", { fromSlug: e.tagSlug, toSlug: e.atomSlug, kind: "derives_from", confidence: e.confidence, provenance: e.provenance }, e.silverItemId, e.tagBranch, "demote"),
    )
    .sort((a, b) => (a.to_slug < b.to_slug ? -1 : a.to_slug > b.to_slug ? 1 : a.from_slug < b.from_slug ? -1 : 1));
}
