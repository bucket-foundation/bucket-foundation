/**
 * The admitted public-source corpus for evidence search (ros-ai-corpus,
 * learning/research-os/ai/IMPLEMENTATION.md, "Source identities").
 *
 * `buildCorpus` turns graph node rows, their curated passages and the
 * rights policy into three artifacts: sources.jsonl, one record per
 * admitted node; passages.jsonl, one record per quotable curated passage;
 * and manifest.json, which pins both by hash. It reads and never writes
 * the graph. `validateCorpus` recomputes every hash and revision from the
 * stored text, so an edited or truncated artifact fails before an encoder
 * or a Quote call trusts it. `staleSources` compares a built corpus with
 * the live graph.
 *
 * Revisions. A source's `sourceRevision` hashes its normalized body, its
 * citation, the extraction and normalization it went through, and the
 * revision of every curated passage it carries, so any edit to what search
 * shows or Quote returns makes a new revision. A passage's
 * `quoteRevision` is the revision graph.source_quote_receipts records for
 * that quotation (curatedSourceRevision on the receipts branch): the same
 * hash over the node id, the passage text as served, its locator and its
 * citation line. Admissions and receipts therefore join on one column.
 */
import { citationLabel } from "../grounding";
import type { Provenance } from "../types";
import { doiSourceId, graphSourceId, parseSourceId } from "./identity";
import { indexRights, quoteRights, type RightsDecision, type RightsPolicy } from "./rights";
import { byteLength, byteSlice, normalizeText, NORMALIZATION, OffsetError, sha256Hex } from "./text";

export const SCHEMA_VERSION = 1;
/** Title, then summary, then the curated passage, each separated by a blank line. */
export const EXTRACTION = "graph-node/1";
/** The development cap from IMPLEMENTATION.md: debug with up to 500 permitted records. */
export const DEBUG_LIMIT = 500;

/** Kinds that never enter this corpus whatever the rights say. */
const EXCLUDED_KINDS: Record<string, string> = {
  excerpt: "a source excerpt, out of canon since 2026-09-21",
  production: "a learner's production, whose rights are its author's",
};

export interface GraphNodeRow {
  id: string;
  slug: string;
  title: string;
  kind: string;
  branch: string;
  visibility: string;
  summary: string | null;
  provenance: Provenance | null;
  superseded_by: string | null;
}

export interface CuratedPassage {
  text: string;
  locator: string;
  url: string;
}

export interface RightsRef {
  rule: string;
  permission: string;
  rightsRevision: number;
}

export interface Citation {
  label: string;
  title: string;
  author?: string;
  year?: number;
  publisher?: string;
  url?: string;
  doi?: string;
}

export interface SourceRecord {
  schemaVersion: 1;
  sourceId: string;
  sourceRevision: string;
  nodeId: string;
  slug: string;
  title: string;
  branch: string;
  kind: string;
  aliases: string[];
  citation: Citation;
  /** Normalized body: title, summary, and the curated passage when there is one. */
  text: string;
  bodyHash: string;
  /** Hash of the body before normalization. */
  originalHash: string;
  normalization: string;
  extraction: string;
  rights: RightsRef;
  passageIds: string[];
}

export interface PassageRecord {
  schemaVersion: 1;
  sourceId: string;
  passageId: string;
  /** The receipt-side revision of this quotation. */
  quoteRevision: string;
  /** Half-open UTF-8 byte span of the passage inside its source's `text`. */
  start: number;
  end: number;
  /** The passage exactly as Quote serves it. */
  original: string;
  originalHash: string;
  textHash: string;
  locator: string;
  url: string;
  rights: RightsRef;
}

export interface Rejection {
  slug: string;
  sourceId: string;
  scope: "index" | "quote";
  reason: string;
}

export interface BuildResult {
  records: SourceRecord[];
  passages: PassageRecord[];
  rejected: Rejection[];
  /** Identity conflicts. Any conflict fails the build. */
  conflicts: string[];
  /** Slug groups with one body. Reported; they index as separate sources. */
  duplicates: string[][];
  considered: number;
  truncatedFrom: number | null;
}

export interface BuildInput {
  nodes: GraphNodeRow[];
  passageFor: (slug: string) => CuratedPassage | null;
  policy: RightsPolicy;
  seedSlugs: Map<string, Set<string>>;
  limit?: number;
}

/** JSON with keys sorted at every depth, so a hash over it is stable. */
export function canonicalJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  if (value && typeof value === "object") {
    const o = value as Record<string, unknown>;
    return `{${Object.keys(o)
      .filter((k) => o[k] !== undefined)
      .sort()
      .map((k) => `${JSON.stringify(k)}:${canonicalJson(o[k])}`)
      .join(",")}}`;
  }
  return JSON.stringify(value);
}

/**
 * The revision graph.source_quote_receipts records for a curated
 * quotation. Kept byte for byte with curatedSourceRevision on the receipts
 * branch (#196): plain JSON.stringify in that key order, over the passage
 * as served.
 */
export function curatedQuoteRevision(input: { nodeId: string; text: string; locator: string; citation: string }): string {
  return sha256Hex(JSON.stringify({ v: 1, nodeId: input.nodeId, text: input.text, locator: input.locator, citation: input.citation }));
}

export function citationOf(node: Pick<GraphNodeRow, "title" | "provenance">): Citation {
  const p = node.provenance ?? {};
  const str = (v: unknown) => (typeof v === "string" && v.trim() ? v.trim() : undefined);
  const doi = str(p.doi);
  return {
    label: citationLabel({ title: node.title, provenance: p }),
    title: str(p.title) ?? node.title,
    author: str(p.author),
    year: typeof p.year === "number" ? p.year : undefined,
    publisher: str(p.publisher),
    url: str(p.url),
    doi,
  };
}

const ref = (d: Extract<RightsDecision, { status: "allowed" }>): RightsRef => ({
  rule: d.rule.id,
  permission: d.rule.permission,
  rightsRevision: d.rule.rightsRevision,
});

export function sourceRevisionOf(r: Pick<SourceRecord, "sourceId" | "bodyHash" | "originalHash" | "citation" | "extraction" | "normalization">, passages: Pick<PassageRecord, "passageId" | "quoteRevision" | "start" | "end">[]): string {
  return sha256Hex(
    canonicalJson({
      v: SCHEMA_VERSION,
      sourceId: r.sourceId,
      bodyHash: r.bodyHash,
      originalHash: r.originalHash,
      citation: r.citation,
      extraction: r.extraction,
      normalization: r.normalization,
      passages: passages.map((p) => ({ passageId: p.passageId, quoteRevision: p.quoteRevision, start: p.start, end: p.end })),
    }),
  );
}

/** One node's record and passages, or why it stays out. Pure. */
export function recordFor(
  node: GraphNodeRow,
  passage: CuratedPassage | null,
  policy: RightsPolicy,
  seedSlugs: Map<string, Set<string>>,
): { record: SourceRecord; passages: PassageRecord[]; rejected: Rejection[] } | { rejected: Rejection[] } {
  const sourceId = graphSourceId(node.id);
  const out = (reason: string, scope: "index" | "quote" = "index") => ({ rejected: [{ slug: node.slug, sourceId, scope, reason }] });
  if (node.visibility !== "public") return out(`visibility is ${node.visibility}`);
  if (node.superseded_by) return out(`superseded by ${node.superseded_by}`);
  if (EXCLUDED_KINDS[node.kind]) return out(EXCLUDED_KINDS[node.kind]);
  const title = (node.title ?? "").trim();
  if (!title) return out("no title");

  const provenanceType = typeof node.provenance?.type === "string" ? node.provenance.type : null;
  const idx = indexRights(policy, { slug: node.slug, provenanceType }, seedSlugs);
  if (idx.status !== "allowed") return out(idx.reason);

  const rejected: Rejection[] = [];
  const citation = citationOf(node);
  let quoted: CuratedPassage | null = null;
  let quoteRef: RightsRef | null = null;
  if (passage) {
    const q = quoteRights(policy, passage.url);
    if (q.status === "allowed") {
      quoted = passage;
      quoteRef = ref(q);
    } else {
      rejected.push({ slug: node.slug, sourceId, scope: "quote", reason: q.reason });
    }
  }

  const summary = (node.summary ?? "").trim();
  const raw = [title, summary, quoted?.text ?? ""].filter(Boolean).join("\n\n");
  const text = normalizeText(raw);
  const base = {
    sourceId,
    bodyHash: sha256Hex(text),
    originalHash: sha256Hex(raw),
    citation,
    extraction: EXTRACTION,
    normalization: NORMALIZATION,
  };

  const passages: PassageRecord[] = [];
  if (quoted && quoteRef) {
    const normalized = normalizeText(quoted.text);
    // The passage sits last in the body, so its span is the final occurrence.
    const at = normalized ? text.lastIndexOf(normalized) : -1;
    if (at === -1) {
      rejected.push({ slug: node.slug, sourceId, scope: "quote", reason: "the passage is not in the body built from it" });
    } else {
      const start = byteLength(text.slice(0, at));
      passages.push({
        schemaVersion: 1,
        sourceId,
        passageId: `${sourceId}#${quoted.locator}`,
        quoteRevision: curatedQuoteRevision({ nodeId: node.id, text: quoted.text, locator: quoted.locator, citation: citation.label }),
        start,
        end: start + byteLength(normalized),
        original: quoted.text,
        originalHash: sha256Hex(quoted.text),
        textHash: sha256Hex(normalized),
        locator: quoted.locator,
        url: quoted.url,
        rights: quoteRef,
      });
    }
  }

  // A provenance DOI names the paper a node rests on. It is the node's own
  // identity only when the node is that paper; a law and a fact citing one
  // paper are two sources.
  const doi = node.kind === "primary_source" ? doiSourceId(citation.doi ?? "") : null;
  const record: SourceRecord = {
    schemaVersion: 1,
    ...base,
    sourceRevision: sourceRevisionOf(base, passages),
    nodeId: node.id,
    slug: node.slug,
    title,
    branch: node.branch,
    kind: node.kind,
    aliases: doi ? [doi] : [],
    text,
    rights: ref(idx),
    passageIds: passages.map((p) => p.passageId),
  };
  return { record, passages, rejected };
}

function shared(records: SourceRecord[], key: (r: SourceRecord) => string[], what: string): string[] {
  const by = new Map<string, string[]>();
  for (const r of records) for (const k of key(r)) by.set(k, [...(by.get(k) ?? []), r.slug]);
  return Array.from(by.entries())
    .filter(([, slugs]) => slugs.length > 1)
    .map(([k, slugs]) => `${what} ${k} is held by ${slugs.join(", ")}`);
}

/** Identity conflicts: two records with one source id, or one DOI alias. Any conflict fails the build. */
export function findConflicts(records: SourceRecord[]): string[] {
  return [...shared(records, (r) => [r.sourceId], "source id"), ...shared(records, (r) => r.aliases, "alias")];
}

/** Nodes whose bodies are identical: duplicates for ros-graph-dedup to merge, listed in the manifest. */
export function duplicateBodies(records: SourceRecord[]): string[][] {
  const by = new Map<string, string[]>();
  for (const r of records) by.set(r.bodyHash, [...(by.get(r.bodyHash) ?? []), r.slug]);
  return Array.from(by.values()).filter((slugs) => slugs.length > 1).map((slugs) => slugs.sort());
}

export function buildCorpus(input: BuildInput): BuildResult {
  const records: SourceRecord[] = [];
  const passages: PassageRecord[] = [];
  const rejected: Rejection[] = [];
  for (const node of input.nodes) {
    const r = recordFor(node, input.passageFor(node.slug), input.policy, input.seedSlugs);
    rejected.push(...r.rejected);
    if ("record" in r) {
      records.push(r.record);
      passages.push(...r.passages);
    }
  }
  // Quotable sources first, then in the policy's rule order, then by slug,
  // so a capped build keeps the records the first Find-to-Quote walk needs.
  const rank = new Map(input.policy.index.map((r, i) => [r.id, i]));
  records.sort(
    (a, b) =>
      b.passageIds.length - a.passageIds.length ||
      (rank.get(a.rights.rule) ?? 0) - (rank.get(b.rights.rule) ?? 0) ||
      (a.slug < b.slug ? -1 : a.slug > b.slug ? 1 : 0),
  );
  const limit = input.limit ?? DEBUG_LIMIT;
  const kept = records.slice(0, limit);
  const keptIds = new Set(kept.map((r) => r.sourceId));
  return {
    records: kept,
    passages: passages.filter((p) => keptIds.has(p.sourceId)).sort((a, b) => (a.passageId < b.passageId ? -1 : 1)),
    rejected,
    conflicts: findConflicts(records),
    duplicates: duplicateBodies(kept),
    considered: input.nodes.length,
    truncatedFrom: records.length > limit ? records.length : null,
  };
}

export interface ArtifactFiles {
  "sources.jsonl": string;
  "passages.jsonl": string;
}

export interface Manifest {
  schemaVersion: 1;
  corpusRevision: string;
  createdAt: string;
  normalization: string;
  extraction: string;
  builder: { commit: string };
  rightsPolicy: { version: number; status: string; sha256: string };
  limit: number;
  truncatedFrom: number | null;
  counts: { considered: number; admitted: number; passages: number; rejected: number };
  duplicates: string[][];
  files: Record<keyof ArtifactFiles, { sha256: string; bytes: number; lines: number }>;
  sources: { sourceId: string; sourceRevision: string }[];
}

const jsonl = (rows: unknown[]) => rows.map((r) => canonicalJson(r)).join("\n") + (rows.length ? "\n" : "");

/** The two data files and the manifest that pins them. Same input, same revision. */
export function writeArtifacts(
  result: BuildResult,
  meta: { createdAt: string; commit: string; policy: RightsPolicy; policySha256: string; limit: number },
): { files: ArtifactFiles; manifest: Manifest } {
  if (result.conflicts.length) throw new Error(`identity conflicts: ${result.conflicts.join("; ")}`);
  const files: ArtifactFiles = { "sources.jsonl": jsonl(result.records), "passages.jsonl": jsonl(result.passages) };
  const fileMeta = (s: string) => ({ sha256: sha256Hex(s), bytes: Buffer.byteLength(s, "utf8"), lines: s ? s.split("\n").length - 1 : 0 });
  const pinned = {
    normalization: NORMALIZATION,
    extraction: EXTRACTION,
    rightsPolicy: meta.policySha256,
    sources: fileMeta(files["sources.jsonl"]).sha256,
    passages: fileMeta(files["passages.jsonl"]).sha256,
  };
  const manifest: Manifest = {
    schemaVersion: 1,
    corpusRevision: sha256Hex(canonicalJson(pinned)),
    createdAt: meta.createdAt,
    normalization: NORMALIZATION,
    extraction: EXTRACTION,
    builder: { commit: meta.commit },
    rightsPolicy: { version: meta.policy.version, status: meta.policy.status, sha256: meta.policySha256 },
    limit: meta.limit,
    truncatedFrom: result.truncatedFrom,
    counts: { considered: result.considered, admitted: result.records.length, passages: result.passages.length, rejected: result.rejected.length },
    duplicates: result.duplicates,
    files: { "sources.jsonl": fileMeta(files["sources.jsonl"]), "passages.jsonl": fileMeta(files["passages.jsonl"]) },
    sources: result.records.map((r) => ({ sourceId: r.sourceId, sourceRevision: r.sourceRevision })),
  };
  return { files, manifest };
}

function parseLines<T>(text: string, name: string, problems: string[]): T[] {
  const out: T[] = [];
  const lines = text.split("\n");
  if (text && !text.endsWith("\n")) problems.push(`${name} does not end in a newline, so its last line may be torn`);
  lines.forEach((line, i) => {
    if (!line) return;
    try {
      out.push(JSON.parse(line) as T);
    } catch {
      problems.push(`${name} line ${i + 1} is not JSON`);
    }
  });
  return out;
}

/**
 * Every check a consumer relies on, recomputed from the stored text.
 * Returns the problems; an empty list means the artifacts are sound.
 */
export function validateCorpus(manifest: Manifest, files: ArtifactFiles, policy: RightsPolicy, policySha256: string): string[] {
  const problems: string[] = [];
  if (manifest.schemaVersion !== 1) problems.push(`manifest schemaVersion ${manifest.schemaVersion} is not 1`);
  if (manifest.normalization !== NORMALIZATION) problems.push(`manifest normalization ${manifest.normalization} is not ${NORMALIZATION}`);
  if (manifest.extraction !== EXTRACTION) problems.push(`manifest extraction ${manifest.extraction} is not ${EXTRACTION}`);
  if (manifest.rightsPolicy.sha256 !== policySha256) problems.push("the rights policy changed since this corpus was built");
  for (const name of ["sources.jsonl", "passages.jsonl"] as const) {
    const s = files[name];
    const want = manifest.files[name];
    if (!want) {
      problems.push(`manifest does not pin ${name}`);
      continue;
    }
    if (sha256Hex(s) !== want.sha256) problems.push(`${name} does not match the hash in the manifest`);
  }
  const pinned = {
    normalization: manifest.normalization,
    extraction: manifest.extraction,
    rightsPolicy: manifest.rightsPolicy.sha256,
    sources: manifest.files["sources.jsonl"]?.sha256,
    passages: manifest.files["passages.jsonl"]?.sha256,
  };
  if (sha256Hex(canonicalJson(pinned)) !== manifest.corpusRevision) problems.push("corpusRevision does not match what the manifest pins");

  const isStr = (v: unknown) => typeof v === "string" && v.length > 0;
  const isInt = (v: unknown) => Number.isInteger(v) && (v as number) >= 0;
  const hasRights = (v: unknown) => {
    const r = v as RightsRef | undefined;
    return Boolean(r) && isStr(r!.rule) && Number.isInteger(r!.rightsRevision);
  };
  // A record missing a field it is checked on is reported and set aside,
  // so one malformed line cannot stop the rest from being checked.
  const records = parseLines<SourceRecord>(files["sources.jsonl"], "sources.jsonl", problems).filter((r, i) => {
    const ok =
      r && ["sourceId", "sourceRevision", "nodeId", "slug", "text", "bodyHash", "originalHash", "normalization", "extraction"].every((k) => isStr((r as unknown as Record<string, unknown>)[k])) &&
      r.citation && typeof r.citation.label === "string" && Array.isArray(r.passageIds) && Array.isArray(r.aliases) && hasRights(r.rights);
    if (!ok) problems.push(`sources.jsonl record ${i + 1} is missing a required field`);
    return ok;
  });
  const passages = parseLines<PassageRecord>(files["passages.jsonl"], "passages.jsonl", problems).filter((p, i) => {
    const ok =
      p && ["sourceId", "passageId", "quoteRevision", "original", "originalHash", "textHash", "locator", "url"].every((k) => isStr((p as unknown as Record<string, unknown>)[k])) &&
      isInt(p.start) && isInt(p.end) && hasRights(p.rights);
    if (!ok) problems.push(`passages.jsonl record ${i + 1} is missing a required field`);
    return ok;
  });
  if (records.length > manifest.limit) problems.push(`${records.length} records exceed the limit of ${manifest.limit}`);
  const indexRules = new Map(policy.index.map((r) => [r.id, r]));
  const quoteRules = new Map(policy.quote.map((r) => [r.id, r]));
  const bySource = new Map<string, PassageRecord[]>();
  for (const p of passages) bySource.set(p.sourceId, [...(bySource.get(p.sourceId) ?? []), p]);
  const recordIds = new Set(records.map((r) => r.sourceId));

  for (const p of passages) {
    const where = `passage ${p.passageId}`;
    if (!recordIds.has(p.sourceId)) problems.push(`${where} belongs to no source record`);
    const rule = quoteRules.get(p.rights?.rule);
    if (!rule || !rule.allow || rule.rightsRevision !== p.rights.rightsRevision) problems.push(`${where} has no current quote permission`);
    if (sha256Hex(p.original) !== p.originalHash) problems.push(`${where} original text does not match its hash`);
    if (sha256Hex(normalizeText(p.original)) !== p.textHash) problems.push(`${where} normalized text does not match its hash`);
  }

  for (const r of records) {
    const where = `source ${r.slug}`;
    const id = parseSourceId(r.sourceId);
    if (!id || id.kind !== "graph" || id.nodeId !== r.nodeId) problems.push(`${where} has a source id that does not name its node`);
    if (normalizeText(r.text) !== r.text) problems.push(`${where} text is not in ${NORMALIZATION} form`);
    if (sha256Hex(r.text) !== r.bodyHash) problems.push(`${where} text does not match its bodyHash`);
    const rule = indexRules.get(r.rights?.rule);
    if (!rule || !rule.allow || rule.rightsRevision !== r.rights.rightsRevision) problems.push(`${where} has no current index permission`);
    const own = (bySource.get(r.sourceId) ?? []).sort((a, b) => (a.passageId < b.passageId ? -1 : 1));
    if (canonicalJson(own.map((p) => p.passageId)) !== canonicalJson([...r.passageIds].sort())) problems.push(`${where} lists passages the passage file does not hold`);
    for (const p of own) {
      try {
        if (byteSlice(r.text, p.start, p.end) !== normalizeText(p.original)) problems.push(`passage ${p.passageId} span does not hold its text`);
      } catch (e) {
        problems.push(`passage ${p.passageId}: ${e instanceof OffsetError ? e.message : String(e)}`);
      }
      const expect = curatedQuoteRevision({ nodeId: r.nodeId, text: p.original, locator: p.locator, citation: r.citation.label });
      if (expect !== p.quoteRevision) problems.push(`passage ${p.passageId} quoteRevision does not match its text, locator and citation`);
    }
    const ordered = [...r.passageIds].sort().map((pid) => own.find((p) => p.passageId === pid)).filter((p): p is PassageRecord => Boolean(p));
    if (sourceRevisionOf(r, ordered) !== r.sourceRevision) problems.push(`${where} sourceRevision does not match its content`);
  }
  problems.push(...findConflicts(records));
  const listed = canonicalJson(manifest.sources);
  const actual = canonicalJson(records.map((r) => ({ sourceId: r.sourceId, sourceRevision: r.sourceRevision })));
  if (listed !== actual) problems.push("the manifest's source list does not match sources.jsonl");
  return problems;
}

/**
 * Sources whose live node no longer produces the record the corpus holds.
 * A stale source is withdrawn from search until the corpus is rebuilt.
 */
export function staleSources(
  records: SourceRecord[],
  live: Map<string, GraphNodeRow>,
  passageFor: (slug: string) => CuratedPassage | null,
  policy: RightsPolicy,
  seedSlugs: Map<string, Set<string>>,
): { sourceId: string; slug: string; reason: string }[] {
  const out: { sourceId: string; slug: string; reason: string }[] = [];
  for (const r of records) {
    const node = live.get(r.nodeId);
    if (!node) {
      out.push({ sourceId: r.sourceId, slug: r.slug, reason: "the node is gone" });
      continue;
    }
    const now = recordFor(node, passageFor(node.slug), policy, seedSlugs);
    if (!("record" in now)) out.push({ sourceId: r.sourceId, slug: r.slug, reason: now.rejected[0]?.reason ?? "no longer admitted" });
    else if (now.record.sourceRevision !== r.sourceRevision) out.push({ sourceId: r.sourceId, slug: r.slug, reason: "the node's text, citation or passage changed" });
  }
  return out;
}
