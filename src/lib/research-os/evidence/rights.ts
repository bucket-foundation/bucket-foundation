/**
 * Copying rights for the evidence corpus, read from
 * learning/research-os/ai/rights-policy.json.
 *
 * Two questions, answered by two rule lists. `index` asks whether a node's
 * own text (title and summary) may be copied into the local search
 * artifacts; it turns on who wrote that text. `quote` asks whether a
 * curated passage may be quoted; it turns on the license of the page the
 * passage comes from. The first matching rule answers. A node or passage
 * no rule matches has unknown copying rights and stays out of the corpus.
 */

export interface RightsRule {
  id: string;
  allow: boolean;
  permission: string;
  basis: string;
  evidence: string[];
  rightsRevision: number;
}

export interface IndexRule extends RightsRule {
  match: { provenanceType?: string; seedFile?: string };
}

export interface QuoteRule extends RightsRule {
  urlPrefix: string;
}

export interface RightsPolicy {
  version: number;
  status: "draft" | "approved";
  reviewedAt: string;
  reviewer: string;
  index: IndexRule[];
  quote: QuoteRule[];
}

export type RightsDecision =
  | { status: "allowed"; rule: RightsRule }
  | { status: "denied"; rule: RightsRule; reason: string }
  | { status: "unknown"; reason: string };

/** Checks the policy's shape, so a malformed rule fails the build instead of matching nothing. */
export function parsePolicy(value: unknown): RightsPolicy {
  const p = value as RightsPolicy;
  const fail = (m: string): never => {
    throw new Error(`rights policy: ${m}`);
  };
  if (!p || typeof p !== "object") fail("not an object");
  if (!Number.isInteger(p.version) || p.version < 1) fail("version must be a positive integer");
  if (p.status !== "draft" && p.status !== "approved") fail(`status must be draft or approved, found ${String(p.status)}`);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(p.reviewedAt ?? "")) fail("reviewedAt must be a date");
  if (!p.reviewer) fail("reviewer is required");
  const ids = new Set<string>();
  const common = (r: RightsRule, where: string) => {
    if (!r.id || ids.has(r.id)) fail(`${where}: rule id missing or repeated: ${r.id}`);
    ids.add(r.id);
    if (typeof r.allow !== "boolean") fail(`${r.id}: allow must be true or false`);
    if (!r.permission || !r.basis) fail(`${r.id}: permission and basis are required`);
    if (!Array.isArray(r.evidence) || r.evidence.length === 0) fail(`${r.id}: at least one piece of evidence`);
    if (!Number.isInteger(r.rightsRevision) || r.rightsRevision < 1) fail(`${r.id}: rightsRevision must be a positive integer`);
  };
  if (!Array.isArray(p.index) || !Array.isArray(p.quote)) fail("index and quote must be lists");
  for (const r of p.index) {
    common(r, "index");
    const keys = Object.keys(r.match ?? {});
    if (keys.length !== 1 || !["provenanceType", "seedFile"].includes(keys[0])) fail(`${r.id}: match names one of provenanceType or seedFile`);
  }
  for (const r of p.quote) {
    common(r, "quote");
    if (!/^https:\/\/[^/]+\//.test(r.urlPrefix ?? "")) fail(`${r.id}: urlPrefix must be an https origin ending in /`);
  }
  return p;
}

export interface RightsSubject {
  slug: string;
  provenanceType: string | null;
}

/** Whether a node's own text may enter the index. `seedSlugs` maps a seed file to the slugs it defines. */
export function indexRights(policy: RightsPolicy, node: RightsSubject, seedSlugs: Map<string, Set<string>>): RightsDecision {
  for (const rule of policy.index) {
    const m = rule.match;
    const hit =
      (m.seedFile !== undefined && (seedSlugs.get(m.seedFile)?.has(node.slug) ?? false)) ||
      (m.provenanceType !== undefined && m.provenanceType === node.provenanceType);
    if (!hit) continue;
    return rule.allow ? { status: "allowed", rule } : { status: "denied", rule, reason: rule.basis };
  }
  return { status: "unknown", reason: `unknown copying rights for provenance type ${node.provenanceType ?? "(none)"}` };
}

/** Whether a curated passage from `url` may be quoted. */
export function quoteRights(policy: RightsPolicy, url: string): RightsDecision {
  for (const rule of policy.quote) {
    if (!url.startsWith(rule.urlPrefix)) continue;
    return rule.allow ? { status: "allowed", rule } : { status: "denied", rule, reason: rule.basis };
  }
  return { status: "unknown", reason: `unknown copying rights for ${url}` };
}
