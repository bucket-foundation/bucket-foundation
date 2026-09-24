import type { IndexRule, RightsPolicy } from "../research-os/evidence/rights";
import { byteSlice, sha256Hex } from "../research-os/evidence/text";
import type { IngestNodeDraft } from "../research-os/ingest/types";
import { bronzeRecord, type BronzeRecord, type BronzeRights } from "../research-os/medallion/bronze";
import { combineConfidence, HIDE_BELOW } from "../research-os/medallion/silver";
import { edgeSubject, EDGE_FACTOID_ROLES, isEvolutionEdgeKind, isEvolutionNodeKind, NODE_FACTOID_ROLES, type EvolutionNodeKind } from "../research-os/evolution";
import type { Span } from "../history/span";

export const EVOLUTION_PARSER = "evolution-import";
export const EVOLUTION_PARSER_REVISION = "evolution-import/1";

export const EVOLUTION_RULES = [
  "onet-cc-by",
  "bls-oews-pd",
  "wikidata-evolution-cc0",
  "openalex-cc0",
  "science4cast-cc-by",
  "eloundou-mit",
  "libraries-io-cc-by-sa",
  "so-survey-odbl",
  "pypl-cc-by",
] as const;

export const GATED_RULES = [
  "isco-gate",
  "hisco-gate",
  "endoflife-gate",
  "chat-owid-gate",
  "aioe-gate",
  "github-innovation-graph-gate",
  "patentsview-gate",
  "histpat-gate",
] as const;

export const SHARE_ALIKE_RULES = new Set<string>(["libraries-io-cc-by-sa", "so-survey-odbl"]);

export const IMPORTER_PROMOTABLE_RULES = new Set<string>(["onet-cc-by", "bls-oews-pd"]);

export type EvolutionRole = string;

export interface EvolutionSource {
  repoPath: string;
  rule: string;
  prior: number;
}

export type RoleFields = Span & { measure?: { metric: string; value: number; unit: string; threshold?: number } };

export type EvolutionSubject =
  | { kind: "node"; slug: string; nodeKind: EvolutionNodeKind; draft?: IngestNodeDraft }
  | { kind: "edge"; fromSlug: string; toSlug: string; edgeKind: string };

export interface EvolutionRecord {
  repoPath: string;
  record: string;
  field: string;
  span: { start: number; end: number };
  subject: EvolutionSubject;
  roles: Record<EvolutionRole, RoleFields>;
  parts?: Record<string, number>;
  qid?: string;
}

export interface EvolutionProposal {
  source: string;
  rule: string;
  record: string;
  field: string;
  roles: Record<EvolutionRole, RoleFields>;
  subject_kind: string;
  subject_resolved: boolean;
  internal: boolean;
  qid?: string;
}

export interface EvolutionSilver {
  source_id: string;
  source_revision: string;
  kind: "claim";
  span_start: number;
  span_end: number;
  locator: string | null;
  text_hash: string;
  text: string | null;
  parser: string;
  parser_revision: string;
  confidence: number;
  confidence_parts: Record<string, number>;
  proposal: EvolutionProposal;
  subject: string;
}

export interface EvolutionPlan {
  bronze: BronzeRecord[];
  silver: EvolutionSilver[];
  proposals: { draft: IngestNodeDraft; silver: EvolutionSilver }[];
  promotions: EvolutionSilver[];
  refused: { record: string; reason: string }[];
  counts: Record<string, number>;
}

export interface NodeRef {
  slug: string;
  kind: string;
}

export interface EdgeRef {
  id: string;
  fromSlug: string;
  toSlug: string;
  kind: string;
}

export interface EvolutionInput {
  sources: EvolutionSource[];
  files: Map<string, Uint8Array>;
  policy: RightsPolicy;
  nodes: NodeRef[];
  edges: EdgeRef[];
  records: (bronze: BronzeRecord, source: EvolutionSource) => EvolutionRecord[];
}

export class RightsRefusal extends Error {
  constructor(
    readonly rule: string,
    readonly reason: "unknown_rule" | "gated" | "not_allowed" | "outside_prefix" | "not_evolution",
    message: string,
  ) {
    super(message);
    Object.setPrototypeOf(this, RightsRefusal.prototype);
    this.name = "RightsRefusal";
  }
}

export function evolutionRule(policy: RightsPolicy, ruleId: string, repoPath: string): IndexRule {
  const rule = policy.index.find((r) => r.id === ruleId);
  if (!rule) throw new RightsRefusal(ruleId, "unknown_rule", `the rights policy has no rule ${ruleId}`);
  if ((GATED_RULES as readonly string[]).includes(ruleId) || rule.permission === "unverified") {
    throw new RightsRefusal(ruleId, "gated", `${ruleId} is behind a license gate and loads nothing until it is confirmed`);
  }
  if (!(EVOLUTION_RULES as readonly string[]).includes(ruleId)) throw new RightsRefusal(ruleId, "not_evolution", `${ruleId} is not an evolution rule`);
  if (!rule.allow) throw new RightsRefusal(ruleId, "not_allowed", `${ruleId} does not allow loading`);
  const prefix = rule.match.sourcePrefix;
  if (!prefix || !repoPath.startsWith(prefix)) throw new RightsRefusal(ruleId, "outside_prefix", `${repoPath} lies outside ${prefix ?? "(no prefix)"} for ${ruleId}`);
  return rule;
}

export function evolutionRights(policy: RightsPolicy, ruleId: string, repoPath: string): BronzeRights {
  const rule = evolutionRule(policy, ruleId, repoPath);
  return { rule: rule.id, revision: rule.rightsRevision, allowIndex: rule.allow, permission: rule.permission };
}

export function isInternalRule(ruleId: string): boolean {
  return SHARE_ALIKE_RULES.has(ruleId);
}

function roleFits(subject: EvolutionSubject, role: string): boolean {
  if (subject.kind === "edge") return isEvolutionEdgeKind(subject.edgeKind) && (EDGE_FACTOID_ROLES as readonly string[]).includes(role);
  return isEvolutionNodeKind(subject.nodeKind) && NODE_FACTOID_ROLES[subject.nodeKind].includes(role);
}

export function planEvolution(input: EvolutionInput): EvolutionPlan {
  const bySlug = new Map(input.nodes.map((n) => [n.slug, n]));
  const edgeByKey = new Map(input.edges.map((e) => [`${e.fromSlug} ${e.kind} ${e.toSlug}`, e]));
  const bronze: BronzeRecord[] = [];
  const silver: EvolutionSilver[] = [];
  const proposals: { draft: IngestNodeDraft; silver: EvolutionSilver }[] = [];
  const refused: { record: string; reason: string }[] = [];
  const counts: Record<string, number> = {};
  const bump = (k: string) => (counts[k] = (counts[k] ?? 0) + 1);
  const proposed = new Set<string>();

  for (const source of input.sources) {
    const rights = evolutionRights(input.policy, source.rule, source.repoPath);
    const bytes = input.files.get(source.repoPath);
    if (!bytes) throw new Error(`evolution source missing: ${source.repoPath}`);
    const b = bronzeRecord(source.repoPath, bytes, rights);
    bronze.push(b);

    for (const r of input.records(b, source)) {
      if (r.repoPath !== source.repoPath) throw new Error(`${r.record} names ${r.repoPath}, read from ${source.repoPath}`);
      const bad = Object.keys(r.roles).filter((role) => !roleFits(r.subject, role));
      if (bad.length) {
        refused.push({ record: r.record, reason: `roles ${bad.join(", ")} do not fit` });
        bump("refused_role");
        continue;
      }
      let subject: string;
      let resolved: boolean;
      let subjectKind: string;
      if (r.subject.kind === "edge") {
        const edge = edgeByKey.get(`${r.subject.fromSlug} ${r.subject.edgeKind} ${r.subject.toSlug}`);
        if (!edge) {
          refused.push({ record: r.record, reason: "edge_not_found" });
          bump("edge_unresolved");
          continue;
        }
        subject = edgeSubject(edge.id);
        resolved = true;
        subjectKind = r.subject.edgeKind;
      } else {
        const held = bySlug.get(r.subject.slug);
        if (held && held.kind !== r.subject.nodeKind) {
          refused.push({ record: r.record, reason: `${r.subject.slug} is a ${held.kind}` });
          bump("refused_kind");
          continue;
        }
        subject = r.subject.slug;
        resolved = Boolean(held);
        subjectKind = r.subject.nodeKind;
      }
      const slice = byteSlice(b.text, r.span.start, r.span.end);
      if (slice.length === 0) throw new Error(`${r.record}: empty span in ${source.repoPath}`);
      const parts = { prior: source.prior, ...(r.parts ?? {}) };
      const item: EvolutionSilver = {
        source_id: b.sourceId,
        source_revision: b.sourceRevision,
        kind: "claim",
        span_start: r.span.start,
        span_end: r.span.end,
        locator: `${r.record}#${r.field}`,
        text_hash: sha256Hex(slice),
        text: b.rights.allowIndex ? slice : null,
        parser: EVOLUTION_PARSER,
        parser_revision: EVOLUTION_PARSER_REVISION,
        confidence: combineConfidence(parts),
        confidence_parts: parts,
        proposal: {
          source: source.repoPath,
          rule: source.rule,
          record: r.record,
          field: r.field,
          roles: r.roles,
          subject_kind: subjectKind,
          subject_resolved: resolved,
          internal: isInternalRule(source.rule),
          ...(r.qid ? { qid: r.qid } : {}),
        },
        subject,
      };
      silver.push(item);
      bump(resolved ? "silver_resolved" : "silver_unresolved");
      if (!resolved && r.subject.kind === "node" && r.subject.draft && !proposed.has(r.subject.slug)) {
        proposed.add(r.subject.slug);
        proposals.push({ draft: r.subject.draft, silver: item });
      }
    }
  }

  const promotions = silver.filter(
    (s) => IMPORTER_PROMOTABLE_RULES.has(s.proposal.rule) && s.proposal.subject_resolved && s.confidence >= HIDE_BELOW && Object.keys(s.proposal.roles).length > 0,
  );
  counts.bronze = bronze.length;
  counts.silver = silver.length;
  counts.proposals = proposals.length;
  counts.promotions = promotions.length;
  counts.refused = refused.length;
  return { bronze, silver, proposals, promotions, refused, counts };
}

export function silverKeyOf(s: Pick<EvolutionSilver, "source_id" | "source_revision" | "parser" | "parser_revision" | "kind" | "span_start" | "span_end" | "subject">): string {
  return [s.source_id, s.source_revision, s.parser, s.parser_revision, s.kind, s.span_start, s.span_end, s.subject].join(" ");
}

export const BATCH_SAMPLE = 200;
export const BATCH_MAX_UPPER = 0.05;

export function wilsonUpper(errors: number, n: number, z = 1.959963984540054): number {
  if (!Number.isInteger(n) || n <= 0) throw new Error("a Wilson bound needs a positive sample");
  if (!Number.isInteger(errors) || errors < 0 || errors > n) throw new Error("errors must lie between 0 and the sample size");
  const p = errors / n;
  const z2 = z * z;
  return (p + z2 / (2 * n) + z * Math.sqrt((p * (1 - p)) / n + z2 / (4 * n * n))) / (1 + z2 / n);
}

export function batchPromotionEnabled(env: Record<string, string | undefined> = process.env): boolean {
  return env.EVOLUTION_BATCH_PROMOTION === "on";
}

export type BatchGate =
  | { ok: true; upper: number }
  | { ok: false; reason: "batch_promotion_off" | "sample_too_small" | "upper_bound_too_high" | "share_alike" | "rule_not_batchable"; upper?: number };

export const BATCHABLE_RULES = new Set<string>(["bls-oews-pd", "wikidata-evolution-cc0", "openalex-cc0"]);

export function batchGate(input: { rule: string; sample: number; errors: number; enabled: boolean }): BatchGate {
  if (!input.enabled) return { ok: false, reason: "batch_promotion_off" };
  if (SHARE_ALIKE_RULES.has(input.rule)) return { ok: false, reason: "share_alike" };
  if (!BATCHABLE_RULES.has(input.rule)) return { ok: false, reason: "rule_not_batchable" };
  if (input.sample < BATCH_SAMPLE) return { ok: false, reason: "sample_too_small" };
  const upper = wilsonUpper(input.errors, input.sample);
  if (upper > BATCH_MAX_UPPER) return { ok: false, reason: "upper_bound_too_high", upper };
  return { ok: true, upper };
}
