/**
 * What evidence search does with more requests in flight than the worker
 * will hold (IMPLEMENTATION.md, "API and worker contracts": one model
 * computation, four waiting, "Queue overflow returns a checked lexical
 * result or 503 if the remaining deadline cannot support it").
 *
 *   set -a; . ./.env.local; set +a
 *   BENCH_EMAIL=you@example.test \
 *   npx ts-node --compiler-options '{"module":"commonjs"}' \
 *     scripts/research-os/evidence/saturate.ts --vectors <dir> [--lanes 1,4,8,16] [--each 40]
 *
 * Each level runs the same requests with more of them in flight, and the
 * worker's own counters are read either side of it, so a degraded answer
 * can be attributed to the refusal that caused it. A degraded answer no
 * counter explains is the finding this run exists for: the caller saw a
 * working search, and the worker never refused anything.
 *
 * Exit 0: saturation stays graceful. Exit 1: a check fails. Exit 2: the
 * run could not start.
 */
import { spawn, type ChildProcess } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import {
  checksTable,
  saturationVerdict,
  summarize,
  SATURATION_THRESHOLDS,
  type SaturationPhase,
  type Sample,
} from "../../../src/lib/research-os/evidence-search/gates";
import { signIn } from "./session";

const FIXTURES = path.join("learning", "research-os", "ai", "model-gate-fixtures.json");

interface Query {
  query: string;
  branch: string;
}

function queries(): Query[] {
  const raw = JSON.parse(readFileSync(FIXTURES, "utf8")) as { cases?: Query[] };
  const rows = (raw.cases ?? []).map((c) => ({ query: c.query, branch: c.branch }));
  if (rows.length === 0) throw new Error(`no queries in ${FIXTURES}`);
  return rows;
}

function arg(name: string, fallback: string): string {
  const at = process.argv.indexOf(`--${name}`);
  return at === -1 ? fallback : (process.argv[at + 1] ?? fallback);
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

interface Counters {
  scored: number;
  queue_full: number;
  deadline: number;
}

class Worker {
  private child: ChildProcess | null = null;
  constructor(
    private readonly url: string,
    private readonly secret: string,
    private readonly vectors: string,
  ) {}

  async healthy(): Promise<boolean> {
    try {
      return (await fetch(`${this.url}/health`, { headers: { "x-evidence-worker-key": this.secret } })).ok;
    } catch {
      return false;
    }
  }

  async counters(): Promise<Counters> {
    const res = await fetch(`${this.url}/health`, { headers: { "x-evidence-worker-key": this.secret } });
    if (!res.ok) throw new Error(`the worker answered ${res.status} on health`);
    const body = (await res.json()) as { counters?: Partial<Counters> };
    const c = body.counters ?? {};
    return { scored: c.scored ?? 0, queue_full: c.queue_full ?? 0, deadline: c.deadline ?? 0 };
  }

  async start(timeoutMs = 90_000): Promise<void> {
    if (this.child) return;
    const started = Date.now();
    this.child = spawn(
      "python3",
      ["-m", "evidence_search", "serve", "--vectors", path.resolve(this.vectors), "--port", String(Number(new URL(this.url).port || 80))],
      { cwd: path.join("tools", "evidence-search"), env: { ...process.env, EVIDENCE_WORKER_SECRET: this.secret }, stdio: ["ignore", "ignore", "inherit"] },
    );
    const exited = new Promise<never>((_, reject) => {
      this.child?.once("exit", (code) => reject(new Error(`the worker exited with code ${code} before it answered`)));
    });
    const ready = (async () => {
      while (Date.now() - started < timeoutMs) {
        if (await this.healthy()) return;
        await sleep(50);
      }
      throw new Error(`the worker did not answer within ${timeoutMs} ms`);
    })();
    await Promise.race([ready, exited]);
  }

  async stop(): Promise<void> {
    const child = this.child;
    this.child = null;
    if (!child || child.exitCode !== null) return;
    const ended = new Promise<void>((resolve) => child.once("exit", () => resolve()));
    child.kill("SIGTERM");
    await Promise.race([ended, sleep(5000).then(() => child.kill("SIGKILL"))]);
    while (await this.healthy()) await sleep(50);
  }
}

async function searchOnce(base: string, token: string, q: Query): Promise<Sample & { code: string | null }> {
  const started = performance.now();
  try {
    const res = await fetch(`${base}/api/research-os/evidence-search`, {
      method: "POST",
      headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
      body: JSON.stringify({ schemaVersion: 1, query: q.query, branch: q.branch, limit: 5 }),
    });
    const body = (await res.json().catch(() => ({}))) as { mode?: "hybrid" | "lexical"; status?: "ok" | "no_match" | "degraded"; error?: string };
    return { ms: performance.now() - started, status: res.status, mode: body.mode, result: body.status, code: body.error ?? null };
  } catch (e) {
    return { ms: performance.now() - started, status: 0, code: e instanceof Error ? e.message.slice(0, 60) : "threw" };
  }
}

/** `count` requests with `lanes` of them in flight at a time. */
async function level(base: string, token: string, qs: Query[], count: number, lanes: number): Promise<(Sample & { code: string | null })[]> {
  const out: (Sample & { code: string | null })[] = new Array(count);
  let next = 0;
  const lane = async () => {
    for (;;) {
      const i = next++;
      if (i >= count) return;
      out[i] = await searchOnce(base, token, qs[i % qs.length]);
    }
  };
  await Promise.all(Array.from({ length: lanes }, lane));
  return out;
}

async function main(): Promise<number> {
  const base = (process.env.BENCH_BASE_URL ?? "http://127.0.0.1:3000").replace(/\/$/, "");
  const email = process.env.BENCH_EMAIL ?? "";
  const url = process.env.EVIDENCE_WORKER_URL ?? "";
  const secret = process.env.EVIDENCE_WORKER_SECRET ?? "";
  const vectors = arg("vectors", path.join("local", "evidence", "vectors"));
  const out = arg("out", path.join("local", "evidence", "gates"));
  const each = Number(arg("each", "40"));
  const lanes = arg("lanes", "1,4,8,16")
    .split(",")
    .map((n) => Number(n.trim()))
    .filter((n) => Number.isInteger(n) && n > 0);
  if (!email) throw new Error("set BENCH_EMAIL to a pilot account on this machine");
  if (!url || !secret) throw new Error("set EVIDENCE_WORKER_URL and EVIDENCE_WORKER_SECRET, the same values the server reads");
  if (lanes.length < 2) throw new Error("--lanes needs at least two concurrency levels");

  const worker = new Worker(url, secret, vectors);
  if (await worker.healthy()) throw new Error(`a worker already answers on ${url}; stop it so this run owns the process and its counters`);
  const session = await signIn(email);
  const qs = queries();
  await worker.start();
  console.log(`[saturate] ${session.email}, ${each} requests at each of ${lanes.join(", ")}`);

  try {
    const probe = await fetch(`${base}/api/research-os/evidence-search`, { headers: { authorization: `Bearer ${session.accessToken}` } });
    const probeBody = (await probe.json().catch(() => ({}))) as { worker?: boolean; corpusRevision?: string; sources?: number; message?: string };
    if (!probe.ok) throw new Error(`the server refused the pilot probe with ${probe.status}: ${probeBody.message ?? "no message"}`);
    if (!probeBody.worker) throw new Error("the server reports no worker; give it the same EVIDENCE_WORKER_URL and EVIDENCE_WORKER_SECRET");

    await level(base, session.accessToken, qs, Math.min(8, qs.length), 1);
    const phases: SaturationPhase[] = [];
    const codes: Record<string, Record<string, number>> = {};
    for (const n of lanes) {
      const before = await worker.counters();
      const samples = await level(base, session.accessToken, qs, each, n);
      const after = await worker.counters();
      phases.push({
        lanes: n,
        summary: summarize(samples),
        scored: after.scored - before.scored,
        queueFull: after.queue_full - before.queue_full,
        deadline: after.deadline - before.deadline,
      });
      codes[String(n)] = samples.reduce<Record<string, number>>((acc, s) => {
        const key = s.status === 200 ? (s.result ?? "unknown") : `${s.status} ${s.code ?? ""}`.trim();
        acc[key] = (acc[key] ?? 0) + 1;
        return acc;
      }, {});
      const p = phases[phases.length - 1];
      console.log(`[saturate] ${n} in flight: p95 ${Math.round(p.summary.p95)} ms, ${p.summary.neural} neural, ${p.summary.degraded} degraded, queue_full ${p.queueFull}, deadline ${p.deadline}`);
    }

    const verdict = saturationVerdict(phases);
    const stamp = new Date().toISOString().replace(/[:.]/g, "-");
    mkdirSync(out, { recursive: true });
    const record = {
      schemaVersion: 1,
      ranAt: new Date().toISOString(),
      base,
      corpusRevision: probeBody.corpusRevision ?? null,
      sources: probeBody.sources ?? null,
      each,
      thresholds: SATURATION_THRESHOLDS,
      phases,
      outcomes: codes,
      verdict,
    };
    writeFileSync(path.join(out, `saturation-${stamp}.json`), `${JSON.stringify(record, null, 2)}\n`);
    const md = [
      `# Evidence search saturation, ${record.ranAt}`,
      "",
      `Corpus \`${String(record.corpusRevision).slice(0, 12)}\`, ${record.sources} sources, ${each} requests at each concurrency. The worker holds one computation and four waiting.`,
      "",
      checksTable(verdict.checks),
      "",
      "| In flight | p50 ms | p95 ms | max ms | neural | degraded | errors | scored | queue_full | deadline |",
      "|---|---|---|---|---|---|---|---|---|---|",
      ...phases.map(
        (p) =>
          `| ${p.lanes} | ${Math.round(p.summary.p50)} | ${Math.round(p.summary.p95)} | ${Math.round(p.summary.max)} | ${p.summary.neural} | ${p.summary.degraded} | ${p.summary.errors} | ${p.scored} | ${p.queueFull} | ${p.deadline} |`,
      ),
      "",
      `Outcomes by concurrency: ${JSON.stringify(codes)}`,
      "",
    ].join("\n");
    writeFileSync(path.join(out, `saturation-${stamp}.md`), md);
    console.log(`\n${md}`);
    return verdict.pass ? 0 : 1;
  } finally {
    await worker.stop();
  }
}

main().then(
  (code) => process.exit(code),
  (e) => {
    console.error(`[saturate] ${e instanceof Error ? e.message : String(e)}`);
    process.exit(2);
  },
);
