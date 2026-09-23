import type { PassageRecord, SourceRecord } from "./corpus";
import type { RightsPolicy, RightsRule } from "./rights";

export interface AdmissionRow {
  source_id: string;
  source_revision: string;
  scope: "index" | "quote";
  node_id: string;
  body_hash: string;
  original_hash: string;
  extraction_revision: string;
  rights_rule: string;
  rights_revision: number;
  allow_index: boolean;
  allow_quote: boolean;
  permission_evidence: { permission: string; basis: string; evidence: string[] };
}

export interface AdmissionResult {
  corpus_revision: string;
  staged: number;
  activated: number;
  unchanged: number;
  retired: number;
  refused: { source_id: string; scope: string; reason: string }[];
}

const evidence = (rule: RightsRule) => ({ permission: rule.permission, basis: rule.basis, evidence: rule.evidence });

export function admissionRows(records: SourceRecord[], passages: PassageRecord[], policy: RightsPolicy): AdmissionRow[] {
  const indexRules = new Map(policy.index.map((r) => [r.id, r]));
  const quoteRules = new Map(policy.quote.map((r) => [r.id, r]));
  const nodeOf = new Map(records.map((r) => [r.sourceId, r.nodeId]));
  const rows: AdmissionRow[] = [];
  for (const r of records) {
    const rule = indexRules.get(r.rights.rule);
    if (!rule) throw new Error(`${r.slug} names index rule ${r.rights.rule}, which the policy lacks`);
    rows.push({
      source_id: r.sourceId,
      source_revision: r.sourceRevision,
      scope: "index",
      node_id: r.nodeId,
      body_hash: r.bodyHash,
      original_hash: r.originalHash,
      extraction_revision: `${r.extraction} ${r.normalization}`,
      rights_rule: rule.id,
      rights_revision: r.rights.rightsRevision,
      allow_index: true,
      allow_quote: false,
      permission_evidence: evidence(rule),
    });
  }
  for (const p of passages) {
    const rule = quoteRules.get(p.rights.rule);
    if (!rule) throw new Error(`${p.passageId} names quote rule ${p.rights.rule}, which the policy lacks`);
    const nodeId = nodeOf.get(p.sourceId);
    if (!nodeId) throw new Error(`${p.passageId} belongs to no source record`);
    rows.push({
      source_id: p.sourceId,
      source_revision: p.quoteRevision,
      scope: "quote",
      node_id: nodeId,
      body_hash: p.textHash,
      original_hash: p.originalHash,
      extraction_revision: "curated-passage/1 nfc-lf/1",
      rights_rule: rule.id,
      rights_revision: p.rights.rightsRevision,
      allow_index: false,
      allow_quote: true,
      permission_evidence: evidence(rule),
    });
  }
  return rows;
}

export function admitRefusal(policy: RightsPolicy, opts: { allowDraft: boolean; problems: string[] }): string | null {
  if (opts.problems.length) return `the corpus fails validation: ${opts.problems.slice(0, 3).join("; ")}`;
  if (policy.status === "draft" && !opts.allowDraft) {
    return "the rights policy is a draft; the founder approves it before admission, or --allow-draft admits it for local development";
  }
  return null;
}
