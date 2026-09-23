import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import type { SupabaseClient } from "@supabase/supabase-js";
import { validateCorpus, type Manifest, type PassageRecord, type SourceRecord } from "../evidence/corpus";
import { parsePolicy, type RightsPolicy } from "../evidence/rights";
import { sha256Hex } from "../evidence/text";
import { inChunks, pagedRead } from "../paging";
import { eligibleKey, LexicalIndex } from "./lexical";
import { evidenceSearch } from "./search";
import type { WorkerConfig } from "./worker-client";
import { MAX_CARDS, type EvidenceCard, type EvidenceSearchRequest, type EvidenceSearchResponse } from "./types";

export const EVIDENCE_DIR = "RESEARCH_OS_EVIDENCE_DIR";

export class CorpusUnavailable extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CorpusUnavailable";
    Object.setPrototypeOf(this, CorpusUnavailable.prototype);
  }
}

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

export function newestCorpusDir(root: string): string | null {
  if (!existsSync(root)) return null;
  const dirs = readdirSync(root)
    .filter((name) => !name.startsWith("."))
    .map((name) => path.join(root, name))
    .filter((dir) => existsSync(path.join(dir, "manifest.json")))
    .sort((a, b) => statSync(path.join(b, "manifest.json")).mtimeMs - statSync(path.join(a, "manifest.json")).mtimeMs);
  return dirs[0] ?? null;
}

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

export function loadCorpus(env: Record<string, string | undefined> = process.env, root = path.join(process.cwd(), "local", "evidence")): Corpus {
  const directory = env.RESEARCH_OS_EVIDENCE_DIR || newestCorpusDir(root);
  if (!directory) throw new CorpusUnavailable(`no built corpus under ${root}; set ${EVIDENCE_DIR}`);
  if (!existsSync(path.join(directory, "manifest.json"))) {
    throw new CorpusUnavailable(`no corpus at ${directory}; ${EVIDENCE_DIR} names a directory with no manifest.json`);
  }
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

export interface Eligible {
  sourceId: string;
  sourceRevision: string;
  nodeId: string | null;
}

export async function eligibleSources(svc: SupabaseClient): Promise<Eligible[]> {
  let rows: { source_id: string; source_revision: string; node_id: string | null }[];
  try {
    rows = await pagedRead<{ source_id: string; source_revision: string; node_id: string | null }>(
      (page) =>
        svc.rpc("eligible_evidence_sources").select("source_id, source_revision, node_id").order("source_id").range(page.from, page.to) as unknown as Promise<{
          data: { source_id: string; source_revision: string; node_id: string | null }[] | null;
          error: { message: string } | null;
        }>,
    );
  } catch (e) {
    throw new EligibilityUnavailable(e instanceof Error ? e.message : String(e));
  }
  return rows.map((r) => ({ sourceId: r.source_id, sourceRevision: r.source_revision, nodeId: r.node_id }));
}

async function quotableRevisions(svc: SupabaseClient, sourceIds: string[]): Promise<Set<string>> {
  let rows: { source_id: string; source_revision: string }[];
  try {
    rows = await inChunks<{ source_id: string; source_revision: string }>(sourceIds, (chunk, page) =>
      svc
        .from("evidence_source_admissions")
        .select("source_id, source_revision")
        .in("source_id", chunk)
        .eq("scope", "quote")
        .eq("status", "active")
        .order("source_id")
        .order("source_revision")
        .range(page.from, page.to) as unknown as Promise<{ data: { source_id: string; source_revision: string }[] | null; error: { message: string } | null }>,
    );
  } catch (e) {
    throw new EligibilityUnavailable(e instanceof Error ? e.message : String(e));
  }
  return new Set(rows.map((r) => r.source_revision));
}

export interface SearchContext {
  corpus: Corpus;
  svc: SupabaseClient;
  worker: WorkerConfig | null;
  requestId: string;
}

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

export function workerFromEnv(env: Record<string, string | undefined> = process.env): WorkerConfig | null {
  const url = env.EVIDENCE_WORKER_URL;
  const secret = env.EVIDENCE_WORKER_SECRET;
  return url && secret ? { url, secret } : null;
}
