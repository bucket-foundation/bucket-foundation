/**
 * Builds and checks the admitted public-source corpus (ros-ai-corpus).
 * Reads graph.nodes, writes nothing to the database.
 *
 *   set -a; . ./.env.local; set +a
 *   npx ts-node --compiler-options '{"module":"commonjs"}' scripts/research-os/evidence/build-corpus.ts build [--limit 500] [--out local/evidence]
 *   npx ts-node --compiler-options '{"module":"commonjs"}' scripts/research-os/evidence/build-corpus.ts check local/evidence/<revision>
 *
 * `build` writes manifest.json, sources.jsonl and passages.jsonl into
 * <out>/<corpusRevision>/ through a temporary directory and one rename, then
 * reads them back through the validator. The same graph and policy give the
 * same revision, so a rebuild with nothing changed writes nothing. Any
 * identity conflict stops the build before a file is written. It refuses
 * to run with less than 50 GiB free on the output disk, the reserve in
 * IMPLEMENTATION.md, "Operating envelope".
 *
 * `check` validates a built corpus and compares it with the live graph.
 *
 * `admit <dir>` records a validated corpus in graph.evidence_source_admissions
 * and makes it the active set, in one transaction. A draft rights policy
 * admits only with --allow-draft, which is for local development.
 * `withdraw <sourceId> --reason <text>` withdraws every revision of one
 * source; admitting it again needs a newer rights revision.
 *
 * Exit 0: done, sound and current. Exit 1: problems, stale or refused
 * sources, listed. Exit 2: the run could not start.
 *
 *   npx ts-node --compiler-options '{"module":"commonjs"}' scripts/research-os/evidence/build-corpus.ts admit local/evidence/<revision> --allow-draft
 *   npx ts-node --compiler-options '{"module":"commonjs"}' scripts/research-os/evidence/build-corpus.ts withdraw graph:<uuid> --reason "permission withdrawn"
 */
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, renameSync, rmSync, statfsSync, writeFileSync } from "node:fs";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";
import { getPassage } from "../../../src/lib/research-os/passages";
import {
  buildCorpus,
  DEBUG_LIMIT,
  staleSources,
  validateCorpus,
  writeArtifacts,
  type ArtifactFiles,
  type GraphNodeRow,
  type Manifest,
  type PassageRecord,
  type SourceRecord,
} from "../../../src/lib/research-os/evidence/corpus";
import { admissionRows, admitRefusal, type AdmissionResult } from "../../../src/lib/research-os/evidence/admissions";
import { parsePolicy, type RightsPolicy } from "../../../src/lib/research-os/evidence/rights";
import { sha256Hex } from "../../../src/lib/research-os/evidence/text";

const ROOT = path.resolve(__dirname, "..", "..", "..");
const POLICY = path.join(ROOT, "learning", "research-os", "ai", "rights-policy.json");
const RESERVE_BYTES = 50 * 1024 ** 3;
const PAGE = 1000;

function loadPolicy(): { policy: RightsPolicy; sha256: string } {
  const raw = readFileSync(POLICY);
  return { policy: parsePolicy(JSON.parse(raw.toString("utf8"))), sha256: sha256Hex(raw) };
}

function seedSlugs(policy: RightsPolicy): Map<string, Set<string>> {
  const out = new Map<string, Set<string>>();
  for (const rule of policy.index) {
    const file = rule.match.seedFile;
    if (!file || out.has(file)) continue;
    const seed = JSON.parse(readFileSync(path.join(ROOT, file), "utf8")) as { nodes?: { slug?: string }[] };
    if (!Array.isArray(seed.nodes)) throw new Error(`${file} has no nodes list`);
    out.set(file, new Set(seed.nodes.map((n) => n.slug).filter((s): s is string => typeof s === "string")));
  }
  return out;
}

function graphDb() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set; source .env.local");
  return createClient(url, key, { db: { schema: "graph" }, auth: { persistSession: false } });
}

async function loadNodes(): Promise<GraphNodeRow[]> {
  const db = graphDb();
  const rows: GraphNodeRow[] = [];
  // PostgREST answers at most 1000 rows, so page in a fixed order.
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await db
      .from("nodes")
      .select("id, slug, title, kind, branch, visibility, summary, provenance, superseded_by")
      .order("id")
      .range(from, from + PAGE - 1);
    if (error) throw new Error(`reading graph.nodes: ${error.message}`);
    rows.push(...((data ?? []) as GraphNodeRow[]));
    if (!data || data.length < PAGE) break;
  }
  return rows;
}

function commit(): string {
  try {
    const sha = execFileSync("git", ["-C", ROOT, "rev-parse", "HEAD"], { encoding: "utf8" }).trim();
    const dirty = execFileSync("git", ["-C", ROOT, "status", "--porcelain", "--", "src/lib/research-os/evidence", "scripts/research-os/evidence", "learning/research-os/ai/rights-policy.json"], { encoding: "utf8" }).trim();
    return dirty ? `${sha}-dirty` : sha;
  } catch {
    return "unknown";
  }
}

function readArtifacts(dir: string): { manifest: Manifest; files: ArtifactFiles } {
  return {
    manifest: JSON.parse(readFileSync(path.join(dir, "manifest.json"), "utf8")) as Manifest,
    files: {
      "sources.jsonl": readFileSync(path.join(dir, "sources.jsonl"), "utf8"),
      "passages.jsonl": readFileSync(path.join(dir, "passages.jsonl"), "utf8"),
    },
  };
}

function flag(args: string[], name: string): string | null {
  const i = args.indexOf(name);
  if (i === -1) return null;
  const v = args[i + 1];
  if (v === undefined || v.startsWith("--")) throw new Error(`${name} needs a value`);
  return v;
}

async function build(args: string[]): Promise<number> {
  const limitArg = flag(args, "--limit");
  const limit = limitArg === null ? DEBUG_LIMIT : Number(limitArg);
  if (!Number.isInteger(limit) || limit < 1) throw new Error("--limit must be a positive integer");
  const out = path.resolve(flag(args, "--out") ?? path.join(ROOT, "local", "evidence"));
  mkdirSync(out, { recursive: true });
  const fs = statfsSync(out);
  const free = fs.bavail * fs.bsize;
  if (free < RESERVE_BYTES) {
    console.error(`[corpus] ${(free / 1024 ** 3).toFixed(1)} GiB free under ${out}; the reserve is 50 GiB, so nothing is built`);
    return 2;
  }

  const { policy, sha256 } = loadPolicy();
  const nodes = await loadNodes();
  const result = buildCorpus({ nodes, passageFor: getPassage, policy, seedSlugs: seedSlugs(policy), limit });
  const reasons = new Map<string, number>();
  for (const r of result.rejected) reasons.set(`${r.scope}: ${r.reason}`, (reasons.get(`${r.scope}: ${r.reason}`) ?? 0) + 1);
  console.log(`[corpus] ${result.considered} nodes read, ${result.records.length} admitted, ${result.passages.length} quotable passages, ${result.rejected.length} rejections`);
  for (const [reason, n] of Array.from(reasons.entries()).sort((a, b) => b[1] - a[1])) console.log(`  ${String(n).padStart(5)}  ${reason}`);
  if (result.truncatedFrom) console.log(`  capped at ${limit} of ${result.truncatedFrom} admissible records`);
  if (result.duplicates.length) console.log(`  ${result.duplicates.length} groups of nodes share one body, for ros-graph-dedup: ${result.duplicates.slice(0, 5).map((g) => g.join(" = ")).join("; ")}`);
  if (result.conflicts.length) {
    for (const c of result.conflicts) console.error(`  [conflict] ${c}`);
    console.error("[corpus] identity conflicts; nothing written");
    return 1;
  }

  const { files, manifest } = writeArtifacts(result, { createdAt: new Date().toISOString(), commit: commit(), policy, policySha256: sha256, limit });
  const dir = path.join(out, manifest.corpusRevision);
  if (existsSync(path.join(dir, "manifest.json"))) {
    console.log(`[corpus] ${dir} already holds this revision; nothing written`);
    return 0;
  }
  const tmp = path.join(out, `.tmp-${manifest.corpusRevision.slice(0, 12)}-${process.pid}`);
  rmSync(tmp, { recursive: true, force: true });
  mkdirSync(tmp);
  writeFileSync(path.join(tmp, "sources.jsonl"), files["sources.jsonl"]);
  writeFileSync(path.join(tmp, "passages.jsonl"), files["passages.jsonl"]);
  writeFileSync(path.join(tmp, "rejected.jsonl"), result.rejected.map((r) => JSON.stringify(r)).join("\n") + "\n");
  writeFileSync(path.join(tmp, "manifest.json"), JSON.stringify(manifest, null, 2) + "\n");
  const back = readArtifacts(tmp);
  const problems = validateCorpus(back.manifest, back.files, policy, sha256);
  if (problems.length) {
    for (const p of problems) console.error(`  [invalid] ${p}`);
    console.error(`[corpus] the written artifacts fail validation; left in ${tmp} for inspection`);
    return 1;
  }
  renameSync(tmp, dir);
  console.log(`[corpus] ${dir}`);
  console.log(`[corpus] revision ${manifest.corpusRevision}, rights policy ${policy.status}`);
  return 0;
}

async function check(args: string[]): Promise<number> {
  const dir = args[0];
  if (!dir) throw new Error("check needs a corpus directory");
  const { policy, sha256 } = loadPolicy();
  const { manifest, files } = readArtifacts(path.resolve(dir));
  const problems = validateCorpus(manifest, files, policy, sha256);
  for (const p of problems) console.log(`  [invalid] ${p}`);
  const records = files["sources.jsonl"].split("\n").filter(Boolean).map((l) => JSON.parse(l) as SourceRecord);
  const live = new Map((await loadNodes()).map((n) => [n.id, n]));
  const stale = staleSources(records, live, getPassage, policy, seedSlugs(policy));
  for (const s of stale) console.log(`  [stale] ${s.slug}: ${s.reason}`);
  console.log(`[corpus] ${manifest.corpusRevision}: ${records.length} sources, ${problems.length} problems, ${stale.length} stale`);
  return problems.length || stale.length ? 1 : 0;
}

const lines = <T>(text: string): T[] => text.split("\n").filter(Boolean).map((l) => JSON.parse(l) as T);

async function admit(args: string[]): Promise<number> {
  const dir = args.find((a) => !a.startsWith("--"));
  if (!dir) throw new Error("admit needs a corpus directory");
  const { policy, sha256 } = loadPolicy();
  const { manifest, files } = readArtifacts(path.resolve(dir));
  const problems = validateCorpus(manifest, files, policy, sha256);
  const refusal = admitRefusal(policy, { allowDraft: args.includes("--allow-draft"), problems });
  if (refusal) {
    console.error(`[corpus] ${refusal}`);
    return 1;
  }
  const rows = admissionRows(lines<SourceRecord>(files["sources.jsonl"]), lines<PassageRecord>(files["passages.jsonl"]), policy);
  const { data, error } = await graphDb().rpc("admit_evidence_corpus", {
    p_corpus_revision: manifest.corpusRevision,
    p_policy_sha256: sha256,
    p_policy_status: policy.status,
    p_rows: rows,
  });
  if (error) throw new Error(`admit_evidence_corpus: ${error.message}`);
  const res = data as AdmissionResult;
  console.log(`[corpus] ${res.corpus_revision}: ${rows.length} rows sent, ${res.staged} staged, ${res.activated} activated, ${res.unchanged} unchanged, ${res.retired} retired`);
  for (const r of res.refused) console.log(`  [refused] ${r.source_id} ${r.scope}: ${r.reason}`);
  return res.refused.length ? 1 : 0;
}

async function withdraw(args: string[]): Promise<number> {
  const sourceId = args[0];
  const reason = flag(args, "--reason");
  if (!sourceId || !reason) throw new Error("withdraw needs a source id and --reason");
  const { data, error } = await graphDb().rpc("withdraw_evidence_source", { p_source_id: sourceId, p_reason: reason });
  if (error) throw new Error(`withdraw_evidence_source: ${error.message}`);
  console.log(`[corpus] ${sourceId}: ${data} revisions withdrawn`);
  return 0;
}

async function main(): Promise<number> {
  const [cmd, ...rest] = process.argv.slice(2);
  try {
    if (cmd === "build") return await build(rest);
    if (cmd === "check") return await check(rest);
    if (cmd === "admit") return await admit(rest);
    if (cmd === "withdraw") return await withdraw(rest);
    console.error("usage: build-corpus.ts build [--limit N] [--out DIR] | check DIR | admit DIR [--allow-draft] | withdraw SOURCE_ID --reason TEXT");
    return 2;
  } catch (e) {
    console.error(`[corpus] ${e instanceof Error ? e.message : e}`);
    return 2;
  }
}

main().then((code) => process.exit(code));
