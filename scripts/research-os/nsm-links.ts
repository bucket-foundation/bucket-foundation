import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { spawn, spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { decompose, FACTOR_EDGES, type DepEdge, type PrimeNodeInput } from "../../src/lib/research-os/primes";
import { pagedRead } from "../../src/lib/research-os/paging";
import { answeringModel, modelMatchesAlias, promptHash } from "../../src/lib/research-os/decompose-further";
import {
  addRandomPairs,
  approvalBySource,
  buildLinkPrompt,
  LINK_SCHEMA,
  mergeProposals,
  nodeText,
  parseLinkAnswer,
  planWrites,
  primeText,
  topCosine,
  type ExistingLink,
  type LinkNode,
  type LinkPrime,
  type LinkProposal,
  type LinkSource,
  type LinkStatus,
  type ModelPick,
} from "../../src/lib/research-os/nsm-links";

const CACHE = path.join(__dirname, "ingest", "out", "nsm-links-cache");

type NodeRow = LinkNode & { kind: string | null };
type EdgeRow = { from_id: string; to_id: string; kind: string; confidence: number | null };
type PrimeRow = { id: string; label: string; english: string[] | null; sense: string | null };

function arg(name: string, fallback?: string): string | undefined {
  const i = process.argv.indexOf(name);
  return i >= 0 ? process.argv[i + 1] : fallback;
}

function all<T>(svc: SupabaseClient, table: string, columns: string, order: string, filter?: (q: any) => any): Promise<T[]> {
  return pagedRead<T>((page) => {
    let q = svc.from(table).select(columns).order(order).range(page.from, page.to);
    if (filter) q = filter(q);
    return q as unknown as Promise<{ data: T[] | null; error: { message: string } | null }>;
  }).catch((err: unknown) => {
    throw new Error(`${table}: ${err instanceof Error ? err.message : String(err)}`);
  });
}

function embed(items: { id: string; text: string }[]): Map<string, number[]> {
  if (!items.length) return new Map();
  const res = spawnSync("python3", [path.join(__dirname, "embed-texts.py")], { input: JSON.stringify(items), encoding: "utf8", maxBuffer: 256 * 1024 * 1024 });
  if (res.status !== 0) throw new Error(`embed-texts.py exited ${res.status}: ${(res.stderr || "").slice(-300)}`);
  return new Map(Object.entries(JSON.parse(res.stdout) as Record<string, number[]>));
}

function askClaude(prompt: string, model: string, timeoutMs: number, schema: object): Promise<{ text: string; modelId: string }> {
  const env = { ...process.env };
  delete env.ANTHROPIC_API_KEY;
  const argv = ["-p", prompt, "--model", model, "--setting-sources", "", "--output-format", "json", "--json-schema", JSON.stringify(schema), "--tools", "", "--no-session-persistence", "--strict-mcp-config"];
  return new Promise((resolve, reject) => {
    const child = spawn("claude", argv, { env, stdio: ["ignore", "pipe", "pipe"] });
    let out = "";
    let err = "";
    const timer = setTimeout(() => {
      child.kill("SIGTERM");
      reject(new Error(`timed out after ${timeoutMs / 1000}s`));
    }, timeoutMs);
    child.stdout.on("data", (d) => (out += d));
    child.stderr.on("data", (d) => (err += d));
    child.on("error", (e) => (clearTimeout(timer), reject(e)));
    child.on("close", (code) => {
      clearTimeout(timer);
      let envelope: any = null;
      try {
        envelope = JSON.parse(out);
      } catch {
        envelope = null;
      }
      if (code !== 0 || !envelope || envelope.is_error) {
        reject(new Error(`claude -p exited ${code}: ${(err || out).slice(0, 200)}`));
        return;
      }
      resolve({ text: envelope.structured_output ? JSON.stringify(envelope.structured_output) : String(envelope.result ?? ""), modelId: answeringModel(envelope.modelUsage, model) });
    });
  });
}

async function report(svc: SupabaseClient) {
  const rows = await all<{ id: string; source: LinkSource; status: LinkStatus }>(svc, "nsm_links", "id, source, status", "id");
  const by = approvalBySource(rows);
  console.log(`[nsm-links] ${rows.length} links, ${rows.filter((r) => r.status === "proposed").length} waiting`);
  for (const [s, w] of Object.entries(by)) {
    console.log(`  ${s}\tdecided ${w.n}\tapproved ${w.k}\trate ${w.rate.toFixed(2)}\t95% ${w.low.toFixed(2)}..${w.high.toFixed(2)}`);
  }
}

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set");
  const svc = createClient(url, key, { db: { schema: "graph" }, auth: { persistSession: false } }) as unknown as SupabaseClient;
  if (process.argv.includes("--report")) return report(svc);

  const apply = process.argv.includes("--apply");
  const noModel = process.argv.includes("--no-model");
  const limit = Number(arg("--limit", "0"));
  const expect = arg("--expect");
  const seed = arg("--seed", "nsm-links-1")!;
  const alias = arg("--model", "sonnet")!;
  const runId = new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d+Z$/, "Z");

  const nodeRows = await all<NodeRow>(svc, "nodes", "id, slug, title, kind, branch, summary", "id", (q) => q.eq("visibility", "public").is("superseded_by", null));
  const live = new Set(nodeRows.map((n) => n.id));
  const edgeRows = (await all<EdgeRow>(svc, "edges", "from_id, to_id, kind, confidence", "id", (q) => q.in("kind", Object.keys(FACTOR_EDGES)))).filter((e) => live.has(e.from_id) && live.has(e.to_id));
  const nodes: PrimeNodeInput[] = nodeRows.map((n) => ({ id: n.id, slug: n.slug, title: n.title, kind: n.kind, branch: n.branch }));
  const edges: DepEdge[] = edgeRows.map((e) => ({ fromId: e.from_id, toId: e.to_id, kind: e.kind, confidence: e.confidence }));
  const dec = decompose(nodes, edges);
  let targets = nodeRows.filter((n) => dec.get(n.id)?.status === "prime").sort((a, b) => (a.slug ?? a.id).localeCompare(b.slug ?? b.id));
  console.log(`[nsm-links] ${nodeRows.length} public nodes, ${targets.length} science primes`);
  if (expect !== undefined && Number(expect) !== targets.length) throw new Error(`expected ${expect} science primes and found ${targets.length}; refusing to continue`);
  if (limit > 0) targets = targets.slice(0, limit);

  const primeRows = await all<PrimeRow>(svc, "nsm_primes", "id, label, english, sense", "id");
  if (primeRows.length === 0) throw new Error("graph.nsm_primes is empty; run scripts/research-os/nsm_exponents.py --apply first");
  const primes: LinkPrime[] = primeRows.map((p) => ({ id: p.id, label: p.label, english: Array.isArray(p.english) ? p.english : [], sense: p.sense }));
  const allowed = new Set(primes.map((p) => p.id));

  const vecs = embed([...primes.map((p) => ({ id: `p:${p.id}`, text: primeText(p) })), ...targets.map((n) => ({ id: `n:${n.id}`, text: nodeText(n) }))]);
  const primeVecs = new Map(primes.map((p) => [p.id, vecs.get(`p:${p.id}`)!] as const));

  let model: string | null = null;
  if (!noModel) {
    const probe = await askClaude("Reply with the single word ok.", alias, 120_000, { type: "object", properties: { ok: { type: "string" } }, required: ["ok"] });
    if (!modelMatchesAlias(alias, probe.modelId)) throw new Error(`model alias ${alias} resolved to ${probe.modelId}; refusing to run under the wrong model`);
    model = probe.modelId;
    mkdirSync(CACHE, { recursive: true });
  }

  const proposals: LinkProposal[] = [];
  const failures: string[] = [];
  for (const n of targets) {
    const hits = topCosine(vecs.get(`n:${n.id}`)!, primeVecs);
    let picks: ModelPick[] = [];
    let hash: string | null = null;
    if (model) {
      const prompt = buildLinkPrompt(n, primes);
      hash = promptHash(`${model}\n${prompt}`);
      const file = path.join(CACHE, `${hash}.txt`);
      let text: string | null = existsSync(file) ? readFileSync(file, "utf8") : null;
      if (text === null) {
        try {
          const r = await askClaude(prompt, model, 300_000, LINK_SCHEMA);
          if (r.modelId !== model) throw new Error(`answered by ${r.modelId}`);
          text = r.text;
        } catch (err) {
          failures.push(`${n.slug}: ${err instanceof Error ? err.message : String(err)}`);
        }
      }
      if (text !== null) {
        const parsed = parseLinkAnswer(text, allowed);
        if ("error" in parsed) failures.push(`${n.slug}: ${parsed.error}`);
        else {
          picks = parsed;
          if (!existsSync(file)) writeFileSync(file, text);
        }
      }
    }
    proposals.push(...mergeProposals(n.id, hits, picks, { model, promptHash: hash }));
  }

  const existing = await all<ExistingLink & { source: LinkSource }>(svc, "nsm_links", "id, node_id, prime_id, status, source", "id");
  const taken = new Set(existing.map((e) => `${e.node_id}|${e.prime_id}`));
  const proposed = new Set(proposals.map((p) => `${p.node_id}|${p.prime_id}`));
  const held = existing.filter((e) => e.source === "random" && !proposed.has(`${e.node_id}|${e.prime_id}`)).length;
  const random = addRandomPairs(proposals, targets.map((n) => n.id), primes.map((p) => p.id), taken, `${seed}|${runId}`, { held });
  const plan = planWrites([...proposals, ...random], existing);
  const bySource: Record<string, number> = {};
  for (const p of [...proposals, ...random]) bySource[p.source] = (bySource[p.source] ?? 0) + 1;
  console.log(`[nsm-links] targets ${targets.length}, model ${model ?? "none"}, proposals ${JSON.stringify(bySource)}`);
  console.log(`[nsm-links] insert ${plan.insert.length}, refresh ${plan.refresh.length}, kept as decided ${plan.kept}, model failures ${failures.length}`);
  if (failures.length) console.log(`[nsm-links] first failure: ${failures[0]}`);
  if (!apply) {
    console.log("[nsm-links] dry run, pass --apply to write");
    return;
  }
  if (plan.insert.length) {
    for (let i = 0; i < plan.insert.length; i += 500) {
      const { error } = await svc.from("nsm_links").insert(plan.insert.slice(i, i + 500).map((p) => ({ ...p, run_id: runId })));
      if (error) throw new Error(`insert: ${error.message}`);
    }
  }
  for (const r of plan.refresh) {
    const { id, node_id: _n, prime_id: _p, ...fields } = r;
    const { error } = await svc.from("nsm_links").update({ ...fields, run_id: runId }).eq("id", id).eq("status", "proposed");
    if (error) throw new Error(`refresh: ${error.message}`);
  }
  console.log(`[nsm-links] written ${runId}`);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
