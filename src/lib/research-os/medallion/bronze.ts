import { NORMALIZATION, normalizeText, sha256Hex } from "../evidence/text";
import { fileSourceId } from "../evidence/identity";
import { indexRights, type RightsPolicy } from "../evidence/rights";
import { checkRepoPath } from "./paths";

export const BRONZE_EXTRACTION = "medallion-file/1";

export interface BronzeRights {
  rule: string;
  revision: number;
  allowIndex: boolean;
  permission: string | null;
}

export interface BronzeRecord {
  sourceId: string;
  sourceRevision: string;
  repoPath: string;
  bodyHash: string;
  originalHash: string;
  extraction: string;
  text: string;
  rights: BronzeRights;
}

export const UNKNOWN_RIGHTS: BronzeRights = { rule: "unknown", revision: 1, allowIndex: false, permission: null };

export function rightsForTypes(policy: RightsPolicy, subjects: { slug: string; provenanceType: string | null }[], seedSlugs: Map<string, Set<string>>): BronzeRights {
  if (subjects.length === 0) return UNKNOWN_RIGHTS;
  let allowed: BronzeRights | null = null;
  for (const s of subjects) {
    const d = indexRights(policy, s, seedSlugs);
    if (d.status === "unknown") return UNKNOWN_RIGHTS;
    if (d.status === "denied") return { rule: d.rule.id, revision: d.rule.rightsRevision, allowIndex: false, permission: d.rule.permission };
    allowed ??= { rule: d.rule.id, revision: d.rule.rightsRevision, allowIndex: true, permission: d.rule.permission };
  }
  return allowed ?? UNKNOWN_RIGHTS;
}

export function directoryManifest(names: string[]): string {
  return [...names].sort().map((n) => `${n}\n`).join("");
}

export function bronzeRevision(input: { sourceId: string; bodyHash: string; originalHash: string; extraction: string }): string {
  return sha256Hex(JSON.stringify(["medallion-bronze/1", input.sourceId, input.bodyHash, input.originalHash, input.extraction, NORMALIZATION]));
}

export function bronzeRecord(repoPath: string, bytes: Uint8Array, rights: BronzeRights, extraction = BRONZE_EXTRACTION): BronzeRecord {
  const checked = checkRepoPath(repoPath);
  if (!checked.ok) throw new Error(`bronze path refused (${checked.error})`);
  const originalHash = sha256Hex(bytes);
  const text = normalizeText(Buffer.from(bytes).toString("utf8"));
  const bodyHash = sha256Hex(text);
  const sourceId = fileSourceId(originalHash);
  return {
    sourceId,
    sourceRevision: bronzeRevision({ sourceId, bodyHash, originalHash, extraction }),
    repoPath,
    bodyHash,
    originalHash,
    extraction,
    text,
    rights,
  };
}

export interface BronzeAdmissionRow {
  source_id: string;
  source_revision: string;
  repo_path: string;
  body_hash: string;
  original_hash: string;
  extraction_revision: string;
  rights_rule: string;
  rights_revision: number;
  allow_index: boolean;
  permission_evidence: Record<string, unknown>;
}

export function admissionRow(b: BronzeRecord): BronzeAdmissionRow {
  return {
    source_id: b.sourceId,
    source_revision: b.sourceRevision,
    repo_path: b.repoPath,
    body_hash: b.bodyHash,
    original_hash: b.originalHash,
    extraction_revision: `${b.extraction} ${NORMALIZATION}`,
    rights_rule: b.rights.rule,
    rights_revision: b.rights.revision,
    allow_index: b.rights.allowIndex,
    permission_evidence: b.rights.permission ? { permission: b.rights.permission } : {},
  };
}

export function runRevision(records: Pick<BronzeRecord, "sourceRevision">[]): string {
  return sha256Hex(JSON.stringify(["medallion-run/1", ...records.map((r) => r.sourceRevision).sort()]));
}
