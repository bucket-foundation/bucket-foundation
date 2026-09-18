export interface Lite {
  id: string;
  slug: string;
  title: string;
  kind: string;
  tier?: number;
  branch?: string;
  frontierFlag?: string | null;
}

export interface NodeData {
  node: {
    id: string; slug: string; title: string; kind: string; tier: number; branch: string; summary: string | null;
    provenance: Record<string, unknown> | null; workedExample: { text?: string; source?: string } | null;
    visibility: "public" | "private" | "shared"; ownerId: string | null; isOwner: boolean; frontierFlag: string | null; createdAt: string;
  };
  standing: { stage: string | null; updatedAt: string | null; evidence: Record<string, unknown>[] };
  prerequisites: Lite[];
  dependents: Lite[];
  related: { kind: string; direction: "in" | "out"; node: Lite }[];
  acting: { kind: string; direction: "in" | "out"; node: Lite }[];
  directions: { dependents: Lite[]; frontier: Lite[]; openQuestions: Lite[]; reach: number[] };
  learn: { branchFile: string; atomId: string | null; href: string } | null;
  productions: { id: string; kind: string; status: string; claim: string | null; related_node_id: string | null; target_node_id: string; node_id: string | null; updated_at: string }[];
  verbs: Record<string, boolean>;
  classes: { id: string; name: string; role: string }[];
  assignments: { id: string; classId: string; className: string; title: string; dueAt: string | null; requiresProduction: boolean }[];
  holders: { stage: string; count: number }[] | null;
  transfer: { itemId: string; prompt: string };
  signedIn: boolean;
}

export type Quote = { quotable_span: string | null; citation: string; locator?: string | null };

export const KIND_LABEL: Record<string, string> = {
  fact: "fact", concept: "concept", law: "law", derivation: "derivation", primary_source: "primary source", artifact: "artifact",
  hypothesis: "hypothesis", extension: "extension", replication: "replication", peer_review: "peer review", production: "production",
};
export const EDGE_LABEL: Record<string, string> = {
  derives_from: "derives from", generalizes: "generalizes", example_of: "is an example of", cites: "cites", contradicts: "contradicts",
  extends: "extends", replicates: "replicates", reviews: "reviews", answers: "answers", prerequisite: "requires",
};
export const branchName = (b: string) => b.replace(/^\d+-/, "").replace(/-/g, " ");
