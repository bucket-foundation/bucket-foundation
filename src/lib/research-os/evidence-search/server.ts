/**
 * One evidence search on the server (ros-ai-find): the eligible set, the
 * ranking, and the cards.
 *
 * The corpus artifacts are read from disk once per process and checked
 * against their manifest. Eligibility comes from the database, the
 * admitted index revisions whose node is public and unmerged right now,
 * and is narrowed to the request's branch. It masks keyword scoring and
 * bounds what the worker may score. After ranking, eligibility is read
 * again and any source that left the set in the meantime is dropped
 * before its text is hydrated. A failure to read eligibility answers 503
 * rather than a search over a stale snapshot.
 *
 * A card's text comes from the corpus, never from the worker, which
 * returns ids and scores. `quoteAvailable` needs an active quote
 * admission for the passage's own revision, so a withdrawn quotation
 * stops offering itself.
 */
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import type { SupabaseClient } from "@supabase/supabase-js";
import { validateCorpus, type Manifest, type PassageRecord, type SourceRecord } from "../evidence/corpus";
import { parsePolicy, type RightsPolicy } from "../evidence/rights";
import { sha256Hex } from "../evidence/text";
import { eligibleKey, LexicalIndex } from "./lexical";
import { evidenceSearch } from "./search";
import type { WorkerConfig } from "./worker-client";
import { MAX_CARDS, type EvidenceCard, type EvidenceSearchRequest, type EvidenceSearchResponse } from "./types";

export const EVIDENCE_DIR = "RESEARCH_OS_EVIDENCE_DIR";
const PAGE = 500;

/** A corpus that was never built here, or one whose files do not validate.
 * No retry changes either. */
export class CorpusUnavailable extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CorpusUnavailable";
    Object.setPrototypeOf(this, CorpusUnavailable.prototype);
  }
}

/**
 * A corpus read that did not complete this minute, which a retry may
 * clear. It extends CorpusUnavailable because it is one: every caller
 * that already treats a corpus as absent stays correct, and the route
 * checks this one first to offer the retry.
 *
 * newestCorpusDir picks by mtime, so a corpus mid-rebuild is selected
 * while its files are still being written and the read that fails now
 * succeeds a moment later.
 */
export class CorpusReadFailed extends CorpusUnavailable {
  constructor(message: string) {
    super(message);
    this.name = "CorpusReadFailed";
    Object.setPrototypeOf(this, CorpusReadFailed.prototype);
  }
}

export class EligibilityUnavailable extends Error {
  constructor(message: string) {
    super(message);
    this.name = "EligibilityUnavailable";
    Object.setPrototypeOf(this, EligibilityUnavailable.prototype);
  }
}

export interface Corpus {
  revision: string;
  directory: string;
  records: Map<string, SourceRecord>;
  passages: Map<string, PassageRecord[]>;
  lexical: LexicalIndex;
}

/** The newest built corpus under `root`, by the time its manifest was written. */
export function newestCorpusDir(root: string): string | null {
  if (!existsSync(root)) return null;
  const dirs = readdirSync(root)
    .map((name) => path.join(root, name))
    .filter((dir) => existsSync(path.join(dir, "manifest.json")))
    .sort((a, b) => statSync(path.join(b, "manifest.json")).mtimeMs - statSync(path.join(a, "manifest.json")).mtimeMs);
  return dirs[0] ?? null;
}

/** Reads and checks a corpus directory. Throws CorpusUnavailable when it cannot be trusted. */
export function readCorpus(directory: string, policy: RightsPolicy, policySha256: string): Corpus {
  let manifest: Manifest;
  let files: { "sources.jsonl": string; "passages.jsonl": string };
  try {
    manifest = JSON.parse(readFileSync(path.join(directory, "manifest.json"), "utf8")) as Manifest;
    files = {
      "sources.jsonl": readFileSync(path.join(directory, "sources.jsonl"), "utf8"),
      "passages.jsonl": readFileSync(path.join(directory, "passages.jsonl"), "utf8"),
    };
  } catch (e) {
    // A read that did not complete. newestCorpusDir picks by mtime, so a
    // corpus mid-rebuild is chosen while its files are still being
    // written, and the next request can succeed. Reporting that as a
    // corpus that was never built refuses a retry that would work.
    throw new CorpusReadFailed(`${directory}: ${e instanceof Error ? e.message : String(e)}`);
  }
  const problems = validateCorpus(manifest, files, policy, policySha256);
  if (problems.length) throw new CorpusUnavailable(`${directory}: ${problems.slice(0, 3).join("; ")}`);
  const records = new Map<string, SourceRecord>();
  for (const line of files["sources.jsonl"].split("\n").filter(Boolean)) {
    const r = JSON.parse(line) as SourceRecord;
    records.set(r.sourceId, r);
  }
  const passages = new Map<string, PassageRecord[]>();
  for (const line of files["passages.jsonl"].split("\n").filter(Boolean)) {
    const p = JSON.parse(line) as PassageRecord;
    passages.set(p.sourceId, [...(passages.get(p.sourceId) ?? []), p]);
  }
  const lexical = LexicalIndex.build(Array.from(records.values()).map((r) => ({ sourceId: r.sourceId, sourceRevision: r.sourceRevision, text: r.text })));
  return { revision: manifest.corpusRevision, directory, records, passages, lexical };
}

let cached: Corpus | null = null;

/** The process's corpus, read once. `RESEARCH_OS_EVIDENCE_DIR` names it, or the newest build under local/evidence. */
export function loadCorpus(env: Record<string, string | undefined> = process.env, root = path.join(process.cwd(), "local", "evidence")): Corpus {
  const directory = env.RESEARCH_OS_EVIDENCE_DIR || newestCorpusDir(root);
  if (!directory) throw new CorpusUnavailable(`no built corpus under ${root}; set ${EVIDENCE_DIR}`);
  if (cached && cached.directory === directory) return cached;
  const policyPath = path.join(process.cwd(), "learning", "research-os", "ai", "rights-policy.json");
  let raw: Buffer;
  try {
    raw = readFileSync(policyPath);
  } catch (e) {
    throw new CorpusReadFailed(`${policyPath}: ${e instanceof Error ? e.message : String(e)}`);
  }
  cached = readCorpus(directory, parsePolicy(JSON.parse(raw.toString("utf8"))), sha256Hex(raw));
  return cached;
}

/** Forgets the cached corpus, for tests and for a rebuild between requests. */
export function forgetCorpus(): void {
  cached = null;
}

export interface Eligible {
  sourceId: string;
  sourceRevision: string;
  nodeId: string | null;
}

/** The admitted index revisions whose node is public right now. Pages, in a fixed order. */
export async function eligibleSources(svc: SupabaseClient): Promise<Eligible[]> {
  const out: Eligible[] = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await svc.rpc("eligible_evidence_sources").select("source_id, source_revision, node_id").order("source_id").range(from, from + PAGE - 1);
    if (error) throw new EligibilityUnavailable(error.message);
    const rows = (data ?? []) as { source_id: string; source_revision: string; node_id: string | null }[];
    out.push(...rows.map((r) => ({ sourceId: r.source_id, sourceRevision: r.source_revision, nodeId: r.node_id })));
    if (rows.length < PAGE) break;
  }
  return out;
}

/** The passage revisions admitted for quoting among `sourceIds`. Reads in pages, in a fixed order. */
export async function quotableRevisions(svc: SupabaseClient, sourceIds: string[]): Promise<Set<string>> {
  const out = new Set<string>();
  for (let i = 0; i < sourceIds.length; i += PAGE) {
    const chunk = sourceIds.slice(i, i + PAGE);
    for (let from = 0; ; from += PAGE) {
      const { data, error } = await svc
        .from("evidence_source_admissions")
        .select("source_id, source_revision")
        .in("source_id", chunk)
        .eq("scope", "quote")
        .eq("status", "active")
        .order("source_revision")
        .range(from, from + PAGE - 1);
      if (error) throw new EligibilityUnavailable(error.message);
      const rows = (data ?? []) as { source_id: string; source_revision: string }[];
      for (const r of rows) out.add(r.source_revision);
      if (rows.length < PAGE) break;
    }
  }
  return out;
}

export interface SearchContext {
  corpus: Corpus;
  svc: SupabaseClient;
  worker: WorkerConfig | null;
  requestId: string;
}

/** A card's excerpt: the curated passage when it is admitted, otherwise the node's own summary. */
export function cardFor(record: SourceRecord, passage: PassageRecord | null, quotable: boolean): EvidenceCard {
  const summary = record.text.slice(record.title.length).trim();
  const usePassage = Boolean(passage && quotable);
  return {
    nodeId: record.nodeId,
    slug: record.slug,
    sourceId: record.sourceId,
    sourceRevision: record.sourceRevision,
    title: record.title,
    citation: record.citation.label,
    kind: usePassage ? "passage" : "summary",
    excerpt: usePassage ? passage!.original : summary || record.title,
    locator: usePassage ? passage!.locator : null,
    sourceUrl: usePassage ? passage!.url : (record.citation.url ?? null),
    quoteAvailable: usePassage,
  };
}

export async function runEvidenceSearch(ctx: SearchContext, request: EvidenceSearchRequest): Promise<EvidenceSearchResponse> {
  const { corpus, svc } = ctx;
  const inBranch = (sourceId: string) => corpus.records.get(sourceId)?.branch === request.branch;
  const current = async () =>
    (await eligibleSources(svc)).filter((e) => {
      const record = corpus.records.get(e.sourceId);
      // A revision the corpus does not hold is stale on one side or the other.
      return Boolean(record && record.sourceRevision === e.sourceRevision && record.branch === request.branch);
    });

  const eligible = await current();
  const result = await evidenceSearch({
    requestId: ctx.requestId,
    query: request.query,
    corpusRevision: corpus.revision,
    eligible: eligible.map((e) => ({ sourceId: e.sourceId, sourceRevision: e.sourceRevision })),
    limit: Math.min(request.limit, MAX_CARDS),
    lexical: corpus.lexical,
    worker: ctx.worker,
  });

  // Read eligibility again: a source withdrawn while the search ran never
  // reaches the response, even though it was scored.
  const still = new Set((await current()).map((e) => eligibleKey(e.sourceId, e.sourceRevision)));
  const ranked = result.results.filter((r) => still.has(eligibleKey(r.sourceId, r.sourceRevision)) && inBranch(r.sourceId));
  const quotable = await quotableRevisions(svc, ranked.map((r) => r.sourceId));
  const cards = ranked.map((r) => {
    const record = corpus.records.get(r.sourceId)!;
    const passages = corpus.passages.get(r.sourceId) ?? [];
    const passage = passages.find((p) => quotable.has(p.quoteRevision)) ?? null;
    return cardFor(record, passage, Boolean(passage));
  });
  return {
    schemaVersion: 1,
    requestId: ctx.requestId,
    mode: result.mode,
    status: cards.length ? result.status : result.status === "degraded" ? "degraded" : "no_match",
    corpusRevision: corpus.revision,
    modelRevision: result.worker.modelRevision,
    cards,
  };
}

/** The worker this process talks to, or null when none is configured. */
export function workerFromEnv(env: Record<string, string | undefined> = process.env): WorkerConfig | null {
  const url = env.EVIDENCE_WORKER_URL;
  const secret = env.EVIDENCE_WORKER_SECRET;
  return url && secret ? { url, secret } : null;
}
