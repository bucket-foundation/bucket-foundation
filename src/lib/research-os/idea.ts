export const DECOMPOSABLE_KINDS = new Set(["concept", "law", "derivation"]);

export const IDEA_SOURCES = new Set(["academy_atom", "canon_entry", "reference", "primary_source"]);

export const BASE_IDEA_SOURCE = "node_proposal";

export function isIdeaNode(n: { kind: string; provenanceType?: string | null }): boolean {
  return DECOMPOSABLE_KINDS.has(n.kind) && (IDEA_SOURCES.has(n.provenanceType ?? "") || n.provenanceType === BASE_IDEA_SOURCE);
}

export const NON_IDEA_REPORT_KINDS: readonly string[] = ["event", "occupation", "task", "technology", "software", "discovery", "topic"];

export function nonIdeaReportFilter(): string {
  return `(${NON_IDEA_REPORT_KINDS.join(",")})`;
}
