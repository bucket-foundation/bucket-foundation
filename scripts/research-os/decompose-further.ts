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
 * --show-shortlist <slug> prints the candidates offered for one target and exits.
 */
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { spawn, spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { decompose, FACTOR_EDGES, type DepEdge } from "../../src/lib/research-os/primes";
import {
  aggregateMissing,
  buildPrompt,
  buildVerifyPrompt,
  idfOf,
  impactOf,
  isCandidateIdea,
  MAX_FACTORS,
  MAX_MISSING,
  parseAnswer,
  parseVerdicts,
  promptHash,
  selectTargets,
  shortlist,
  toNodeProposals,
  toProposals,
  type Answer,
  type Candidate,
  type GraphNode,
  type ProposalRow,
  type Target,
  type Verdict,
} from "../../src/lib/research-os/decompose-further";

const OUT = path.join(__dirname, "ingest", "out");
const CACHE = path.join(OUT, "decompose-cache");

const VERIFY_SCHEMA = {
  type: "object",
  properties: {
    verdicts: {
      type: "array",
      items: { type: "object", properties: { slug: { type: "string" }, holds: { type: "boolean" }, why: { type: "string" } }, required: ["slug", "holds", "why"] },
    },
  },
  required: ["verdicts"],
};

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

/** Unit vectors for each id's text from scripts/research-os/embed-texts.py (local model, cached). */
export function embed(items: { id: string; text: string }[]): Map<string, number[]> {
  if (!items.length) return new Map();
  const res = spawnSync("python3", [path.join(__dirname, "embed-texts.py")], {
    input: JSON.stringify(items),
    encoding: "utf8",
    maxBuffer: 512 * 1024 * 1024,
  });
  if (res.status !== 0) throw new Error(`embed-texts.py exited ${res.status}: ${(res.stderr || "").slice(-300)}`);
  return new Map(Object.entries(JSON.parse(res.stdout) as Record<string, number[]>));
}

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
function askClaude(prompt: string, model: string, timeoutMs: number, schema: object): Promise<string> {
  const env = { ...process.env };
  delete env.ANTHROPIC_API_KEY;
  const argv = [
    "-p", prompt,
    "--model", model,
    "--setting-sources", "",
    "--output-format", "json",
    "--json-schema", JSON.stringify(schema),
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
  const verifyModel = arg("--verify-model", "opus")!;
  const dryRun = process.argv.includes("--dry-run");
  const svc = createClient(url, key, { db: { schema: "graph" }, auth: { persistSession: false } }) as unknown as SupabaseClient;

  // Public, current nodes only: private text never reaches the model.
  const rows = await all<GraphNode>(svc, "nodes", "id, slug, title, kind, branch, summary, provenanceType:provenance->>type", (q) =>
    q.eq("visibility", "public").is("superseded_by", null),
  );
  const edgeRows = await all<{ from_id: string; to_id: string; kind: string; confidence: number | null }>(svc, "edges", "from_id, to_id, kind, confidence", (q) =>
    q.in("kind", Object.keys(FACTOR_EDGES)),
  );
  const edges: DepEdge[] = edgeRows.map((e) => ({ fromId: e.from_id, toId: e.to_id, kind: e.kind, confidence: e.confidence }));
  const dec = decompose(rows, edges);
  const pool: Candidate[] = rows.map((n) => {
    const d = dec.get(n.id)!;
    return { ...n, tier: d.status === "unfactored" ? null : d.tier, prime: d.status === "prime" };
  });
  const ideaPool = pool.filter(isCandidateIdea);
  const vectors = embed(ideaPool.map((c) => ({ id: c.slug, text: `${c.title}. ${c.summary ?? ""}`.trim() })));
  const idf = idfOf(ideaPool);
  let targets = selectTargets(rows, dec);
  const show = arg("--show-shortlist");
  if (show) {
    const t = targets.find((x) => x.slug === show);
    if (!t) throw new Error(`${show} is not a decompose target`);
    for (const c of shortlist(t, pool, dec, { vectors, idf })) console.log(`${c.branch}\t${c.tier ?? "-"}\t${c.slug}\t${c.title}`);
    return;
  }
  if (limit > 0) targets = targets.slice(0, limit);
  mkdirSync(CACHE, { recursive: true });
  console.log(`[decompose-further] ${targets.length} targets, proposer ${model}, verifier ${verifyModel}, concurrency ${concurrency}${dryRun ? ", dry run" : ""}`);

  /**
   * Ask once per prompt. A reply is cached by the prompt's hash only after
   * `accept` parses it, so a malformed reply is asked again on the next run.
   */
  async function cachedAsk<T>(
    prompt: string,
    m: string,
    schema: object,
    accept: (reply: string) => T | { error: string },
  ): Promise<{ value: T | { error: string }; hash: string; cached: boolean }> {
    const hash = promptHash(`${m}\n${prompt}`);
    const cacheFile = path.join(CACHE, `${hash}.txt`);
    if (existsSync(cacheFile)) return { value: accept(readFileSync(cacheFile, "utf8")), hash, cached: true };
    const reply = await askClaude(prompt, m, 240_000, schema);
    const value = accept(reply);
    if (!(value && typeof value === "object" && "error" in (value as object))) writeFileSync(cacheFile, reply);
    return { value, hash, cached: false };
  }

  const bySlug = new Map(pool.map((c) => [c.slug, c]));
  const results: { target: Target; answer: Answer; hash: string; cached: boolean; verdicts: Map<string, Verdict>; verifyHash: string | null }[] = [];
  const failures: { slug: string; reason: string }[] = [];
  let next = 0;
  let done = 0;
  async function worker() {
    while (next < targets.length) {
      const target = targets[next++];
      const cands = shortlist(target, pool, dec, { vectors, idf });
      try {
        const allowed = new Set(cands.map((c) => c.slug));
        const ask = await cachedAsk(buildPrompt(target, cands), model, SCHEMA, (r) => parseAnswer(r, allowed, target.slug));
        const parsed = ask.value;
        if ("error" in parsed) {
          failures.push({ slug: target.slug, reason: `proposer: ${parsed.error}` });
        } else {
          let verdicts = new Map<string, Verdict>();
          let verifyHash: string | null = null;
          let verified = true;
          if (parsed.factors.length) {
            const factors = parsed.factors.map((f) => bySlug.get(f.slug)!).filter(Boolean);
            const asked = new Set(factors.map((f) => f.slug));
            const v = await cachedAsk(buildVerifyPrompt(target, factors), verifyModel, VERIFY_SCHEMA, (r) => parseVerdicts(r, asked));
            verifyHash = v.hash;
            if ("error" in v.value) {
              // Without a verdict the pairs would queue as unconfirmed and a later
              // good run could not upgrade them, so the target waits for a rerun.
              failures.push({ slug: target.slug, reason: `verifier: ${v.value.error}` });
              verified = false;
            } else verdicts = v.value;
          }
          if (verified) results.push({ target, answer: parsed, hash: ask.hash, cached: ask.cached, verdicts, verifyHash });
        }
      } catch (e) {
        failures.push({ slug: target.slug, reason: e instanceof Error ? e.message : String(e) });
      }
      done++;
      if (done % 10 === 0 || done === targets.length) console.log(`[decompose-further] ${done}/${targets.length}`);
    }
  }
  await Promise.all(Array.from({ length: concurrency }, () => worker()));

  const branchOf = new Map<string, string | null>(rows.map((n) => [n.slug, n.branch]));
  const proposals: ProposalRow[] = results.flatMap((r) =>
    toProposals(r.target, r.answer, {
      model,
      hash: r.hash,
      verdicts: r.verdicts,
      verifyModel,
      verifyHash: r.verifyHash,
      impact: impactOf(r.target.id, dec),
      branchOf,
    }),
  );
  const missing = aggregateMissing(results);
  const nodeProposals = toNodeProposals(missing, model);
  const crossBranch = proposals.filter((p) => p.cross_branch).length;
  const confirmed = proposals.filter((p) => p.agreement).length;
  const irreducible = results.filter((r) => r.answer.irreducible).map((r) => r.target.slug);

  // Already-decided rows stay as they are: a rerun never reopens a reviewer's decision.
  let queued = 0;
  let queuedNodes = 0;
  if (!dryRun) {
    for (let i = 0; i < proposals.length; i += 200) {
      const chunk = proposals.slice(i, i + 200);
      const { error } = await svc.from("edge_proposals").upsert(chunk, { onConflict: "from_slug,to_slug", ignoreDuplicates: true });
      if (error) throw new Error(`edge_proposals: ${error.message}`);
      queued += chunk.length;
    }
    for (let i = 0; i < nodeProposals.length; i += 200) {
      const chunk = nodeProposals.slice(i, i + 200);
      const { error } = await svc.from("node_proposals").upsert(chunk, { onConflict: "key", ignoreDuplicates: true });
      if (error) throw new Error(`node_proposals: ${error.message}`);
      queuedNodes += chunk.length;
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
    confirmed_by_verifier: confirmed,
    cross_branch_proposals: crossBranch,
    queued,
    node_proposals: nodeProposals.length,
    queued_node_proposals: queuedNodes,
    base_matches: nodeProposals.filter((n) => n.base_match).map((n) => ({ title: n.title, base: n.base_match, named_by: n.named_by.length })),
    // The share of pairs the verifier confirmed, split the two ways that matter
    // for bias: factors from another branch, and targets that were primes.
    confirmation: (() => {
      const rate = (rows: ProposalRow[]) => ({ pairs: rows.length, confirmed: rows.filter((r) => r.agreement).length });
      const primeTargets = new Set(results.filter((r) => r.target.status === "prime").map((r) => r.target.slug));
      return {
        all: rate(proposals),
        cross_branch: rate(proposals.filter((p) => p.cross_branch)),
        same_branch: rate(proposals.filter((p) => !p.cross_branch)),
        prime_targets: rate(proposals.filter((p) => primeTargets.has(p.to_slug))),
        unfactored_targets: rate(proposals.filter((p) => !primeTargets.has(p.to_slug))),
      };
    })(),
    irreducible,
    missing_primes: missing,
    answers: results.map((r) => ({
      slug: r.target.slug,
      status: r.target.status,
      branch: r.target.branch,
      ...r.answer,
      verdicts: Object.fromEntries(r.verdicts),
    })),
  };
  writeFileSync(path.join(OUT, "decompose-further.json"), JSON.stringify(report, null, 1));
  console.log(
    `[decompose-further] answered ${results.length}/${targets.length} (${report.from_cache} from cache), ${failures.length} failed; ` +
      `${proposals.length} proposals, ${confirmed} confirmed by the verifier, ${crossBranch} across branches, ${queued} queued; ` +
      `${nodeProposals.length} missing primes, ${queuedNodes} queued; ${irreducible.length} called irreducible`,
  );
  console.log("[decompose-further] missing base ideas named most often:");
  for (const m of missing.slice(0, 15)) console.log(`  ${m.targets.length}\t${m.title}\t${m.branches.join(", ")}`);
  if (failures.length) console.log(`[decompose-further] first failure: ${failures[0].slug}: ${failures[0].reason}`);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
