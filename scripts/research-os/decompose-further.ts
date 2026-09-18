/**
 * The decompose-further queue (ros-prime 2): for every prime and every
 * unfactored concept or law, ask the model what the node rests on and queue
 * the answers as pending prerequisite proposals for /research-os/edges.
 * Pure logic lives in src/lib/research-os/decompose-further.ts.
 *
 * The model runs through `claude -p` under this machine's login, with the
 * same flags the hypothesis engine uses (tools off, no session, no settings,
 * a JSON schema). ANTHROPIC_API_KEY is removed from the child environment so
 * the login is what answers. Replies are cached by prompt hash in
 * scripts/research-os/ingest/out/decompose-cache/, so a rerun converges and
 * only asks about nodes whose prompt changed.
 *
 * Run from the repo root with the local stack's keys in .env.local:
 *   set -a; . ./.env.local; set +a
 *   npx ts-node --compiler-options '{"module":"commonjs"}' scripts/research-os/decompose-further.ts [--limit N] [--dry-run] [--concurrency 4] [--model sonnet]
 *
 * --dry-run asks the model and writes the report but queues nothing.
 */
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { spawn } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { decompose, FACTOR_EDGES, type DepEdge } from "../../src/lib/research-os/primes";
import {
  aggregateMissing,
  buildPrompt,
  MAX_FACTORS,
  MAX_MISSING,
  parseAnswer,
  promptHash,
  selectTargets,
  shortlist,
  toProposals,
  type Answer,
  type Candidate,
  type GraphNode,
  type ProposalRow,
  type Target,
} from "../../src/lib/research-os/decompose-further";

const OUT = path.join(__dirname, "ingest", "out");
const CACHE = path.join(OUT, "decompose-cache");

const SCHEMA = {
  type: "object",
  properties: {
    irreducible: { type: "boolean" },
    factors: { type: "array", maxItems: MAX_FACTORS, items: { type: "object", properties: { slug: { type: "string" }, why: { type: "string" } }, required: ["slug", "why"] } },
    missing: {
      type: "array",
      maxItems: MAX_MISSING,
      items: { type: "object", properties: { title: { type: "string" }, branch: { type: "string" }, why: { type: "string" } }, required: ["title", "branch", "why"] },
    },
  },
  required: ["irreducible", "factors", "missing"],
};

function arg(name: string, fallback?: string): string | undefined {
  const i = process.argv.indexOf(name);
  return i >= 0 ? process.argv[i + 1] : fallback;
}

async function all<T>(svc: SupabaseClient, table: string, columns: string, filter?: (q: any) => any): Promise<T[]> {
  const out: T[] = [];
  for (let from = 0; ; from += 1000) {
    let q = svc.from(table).select(columns).range(from, from + 999);
    if (filter) q = filter(q);
    const { data, error } = await q;
    if (error) throw new Error(`${table}: ${error.message}`);
    out.push(...((data ?? []) as T[]));
    if (!data || data.length < 1000) return out;
  }
}

/** One `claude -p` call; resolves to the reply text or throws with a short reason. */
function askClaude(prompt: string, model: string, timeoutMs: number): Promise<string> {
  const env = { ...process.env };
  delete env.ANTHROPIC_API_KEY;
  const argv = [
    "-p", prompt,
    "--model", model,
    "--setting-sources", "",
    "--output-format", "json",
    "--json-schema", JSON.stringify(SCHEMA),
    "--tools", "",
    "--no-session-persistence",
    "--strict-mcp-config",
  ];
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
      let env: any = null;
      try {
        env = JSON.parse(out);
      } catch {
        env = null;
      }
      if (code !== 0 || !env || env.is_error) {
        reject(new Error(`claude -p exited ${code}${env?.stop_reason ? `, stop_reason ${env.stop_reason}` : ""}: ${(err || out).slice(0, 200)}`));
        return;
      }
      resolve(env.structured_output ? JSON.stringify(env.structured_output) : String(env.result ?? ""));
    });
  });
}

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set");
  const limit = Number(arg("--limit", "0"));
  const concurrency = Math.max(1, Number(arg("--concurrency", "4")));
  const model = arg("--model", "sonnet")!;
  const dryRun = process.argv.includes("--dry-run");
  const svc = createClient(url, key, { db: { schema: "graph" }, auth: { persistSession: false } }) as unknown as SupabaseClient;

  const rows = await all<GraphNode>(svc, "nodes", "id, slug, title, kind, branch, summary");
  const edgeRows = await all<{ from_id: string; to_id: string; kind: string; confidence: number | null }>(svc, "edges", "from_id, to_id, kind, confidence", (q) =>
    q.in("kind", Object.keys(FACTOR_EDGES)),
  );
  const edges: DepEdge[] = edgeRows.map((e) => ({ fromId: e.from_id, toId: e.to_id, kind: e.kind, confidence: e.confidence }));
  const dec = decompose(rows, edges);
  const pool: Candidate[] = rows.map((n) => {
    const d = dec.get(n.id)!;
    return { ...n, tier: d.status === "unfactored" ? null : d.tier, prime: d.status === "prime" };
  });
  let targets = selectTargets(rows, dec);
  if (limit > 0) targets = targets.slice(0, limit);
  mkdirSync(CACHE, { recursive: true });
  console.log(`[decompose-further] ${targets.length} targets, model ${model}, concurrency ${concurrency}${dryRun ? ", dry run" : ""}`);

  const results: { target: Target; answer: Answer; hash: string; cached: boolean }[] = [];
  const failures: { slug: string; reason: string }[] = [];
  let next = 0;
  let done = 0;
  async function worker() {
    while (next < targets.length) {
      const target = targets[next++];
      const cands = shortlist(target, pool, dec);
      const prompt = buildPrompt(target, cands);
      const hash = promptHash(prompt);
      const cacheFile = path.join(CACHE, `${hash}.txt`);
      let reply: string | null = existsSync(cacheFile) ? readFileSync(cacheFile, "utf8") : null;
      const cached = reply !== null;
      try {
        if (reply === null) {
          reply = await askClaude(prompt, model, 240_000);
          writeFileSync(cacheFile, reply);
        }
        const parsed = parseAnswer(reply, new Set(cands.map((c) => c.slug)), target.slug);
        if ("error" in parsed) failures.push({ slug: target.slug, reason: parsed.error });
        else results.push({ target, answer: parsed, hash, cached });
      } catch (e) {
        failures.push({ slug: target.slug, reason: e instanceof Error ? e.message : String(e) });
      }
      done++;
      if (done % 10 === 0 || done === targets.length) console.log(`[decompose-further] ${done}/${targets.length}`);
    }
  }
  await Promise.all(Array.from({ length: concurrency }, () => worker()));

  const proposals: ProposalRow[] = results.flatMap((r) => toProposals(r.target, r.answer, model, r.hash));
  const missing = aggregateMissing(results);
  const crossBranch = proposals.filter((p) => rows.find((n) => n.slug === p.from_slug)?.branch !== p.branch).length;
  const irreducible = results.filter((r) => r.answer.irreducible).map((r) => r.target.slug);

  let queued = 0;
  if (!dryRun && proposals.length) {
    for (let i = 0; i < proposals.length; i += 200) {
      const chunk = proposals.slice(i, i + 200);
      const { error } = await svc.from("edge_proposals").upsert(chunk, { onConflict: "from_slug,to_slug", ignoreDuplicates: true });
      if (error) throw new Error(`edge_proposals: ${error.message}`);
      queued += chunk.length;
    }
  }

  const report = {
    generated_at: new Date().toISOString(),
    model,
    targets: targets.length,
    answered: results.length,
    from_cache: results.filter((r) => r.cached).length,
    failures,
    proposals: proposals.length,
    cross_branch_proposals: crossBranch,
    queued,
    irreducible,
    missing_primes: missing,
    answers: results.map((r) => ({ slug: r.target.slug, status: r.target.status, branch: r.target.branch, ...r.answer })),
  };
  writeFileSync(path.join(OUT, "decompose-further.json"), JSON.stringify(report, null, 1));
  console.log(
    `[decompose-further] answered ${results.length}/${targets.length} (${report.from_cache} from cache), ${failures.length} failed; ` +
      `${proposals.length} proposals, ${crossBranch} across branches, ${queued} queued; ${irreducible.length} called irreducible`,
  );
  console.log("[decompose-further] missing base ideas named most often:");
  for (const m of missing.slice(0, 15)) console.log(`  ${m.targets.length}\t${m.title}\t${m.branches.join(", ")}`);
  if (failures.length) console.log(`[decompose-further] first failure: ${failures[0].slug}: ${failures[0].reason}`);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
